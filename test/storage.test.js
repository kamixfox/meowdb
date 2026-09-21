import { beforeAll, afterAll, describe, test, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { db, userPath, storagePath, sanitizeSegment } from "../src/db.js";
import { generateToken } from "../src/tokens.js";

describe("/storage", async function () {
  const username = "storage-test-user";
  let authToken;

  beforeAll(async function () {
    await db.delete(userPath(username));
    await db.set(userPath(username), {
      username: username,
      passwordHash: "fake",
    });

    authToken = await generateToken({ username: username });
  });

  afterAll(async function () {
    await db.delete(userPath(username));
  });

  test("Rejects requests without an authorization header", async function () {
    const res = await request(app).get(`/api/v1/storage/anything`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("No authorization header");
  });

  test("Rejects requests with an invalid token", async function () {
    const res = await request(app)
      .get(`/api/v1/storage/anything`)
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
    expect(res.body).to.have.property("error");
  });

  test("PUT writes a key", async function () {
    const res = await request(app)
      .put(`/api/v1/storage/greeting`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "meow" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  test("GET reads a key that was written", async function () {
    const res = await request(app)
      .get(`/api/v1/storage/greeting`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ key: "greeting", value: "meow", exists: true });
  });

  test("GET returns 404 for a missing key", async function () {
    const res = await request(app)
      .get(`/api/v1/storage/does-not-exist`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      exists: false,
      error: "This key does not exist.",
    });
  });

  test("DELETE removes a key", async function () {
    const del = await request(app)
      .delete(`/api/v1/storage/greeting`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ success: true });

    const get = await request(app)
      .get(`/api/v1/storage/greeting`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(get.status).toBe(404);
  });

  test("DELETE returns 404 for a missing key", async function () {
    const res = await request(app)
      .delete(`/api/v1/storage/does-not-exist`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      exists: false,
      error: "This key does not exist.",
    });
  });

  test("Storage is isolated per user", async function () {
    const otherUser = "storage-other-user";
    await db.delete(userPath(otherUser));
    await db.set(userPath(otherUser), {
      username: otherUser,
      passwordHash: "fake",
    });
    const otherToken = await generateToken({ username: otherUser });

    await request(app)
      .put(`/api/v1/storage/shared-key`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "first-user" });
    await request(app)
      .put(`/api/v1/storage/shared-key`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ value: "second-user" });

    const first = await request(app)
      .get(`/api/v1/storage/shared-key`)
      .set("Authorization", `Bearer ${authToken}`);
    const second = await request(app)
      .get(`/api/v1/storage/shared-key`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(first.body.value).toBe("first-user");
    expect(second.body.value).toBe("second-user");

    await db.delete(userPath(otherUser));
  });

  test("Keys are sanitized in the storage path", async function () {
    await db.delete(storagePath(username, "dot.key"));

    const res = await request(app)
      .put(`/api/v1/storage/dot.key`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "dotted" });

    expect(res.status).toBe(200);
    expect(await db.has(storagePath(username, "dot.key"))).toBe(true);
  });
});

describe("/storage quotas", async function () {
  const username = "quota-test-user";
  let authToken;

  beforeAll(async function () {
    await db.delete(userPath(username));
    const row = db.driver.database
      .prepare("SELECT json FROM json WHERE ID = ?")
      .get("storage");
    const allStorage = row ? JSON.parse(row.json) : {};
    for (const key of Object.keys(
      allStorage[sanitizeSegment(username)] ?? {},
    )) {
      await db.delete(storagePath(username, key));
    }
    await db.set(userPath(username), {
      username: username,
      passwordHash: "fake",
    });
    authToken = await generateToken({ username: username });
  });

  afterAll(async function () {
    delete process.env.MAX_STORAGE_KEYS;
    delete process.env.MAX_STORAGE_BYTES;
    await db.delete(userPath(username));
  });

  test("Key quota is enforced and existing values are preserved", async function () {
    process.env.MAX_STORAGE_KEYS = "2";
    process.env.MAX_STORAGE_BYTES = "1000000";

    const res1 = await request(app)
      .put(`/api/v1/storage/k1`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "v1" });
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .put(`/api/v1/storage/k2`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "v2" });
    expect(res2.status).toBe(200);

    const res3 = await request(app)
      .put(`/api/v1/storage/k3`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "v3" });
    expect(res3.status).toBe(400);
    expect(res3.body.error).toMatch(/keys/);

    expect(await db.has(storagePath(username, "k2"))).toBe(true);
    expect(await db.has(storagePath(username, "k3"))).toBe(false);

    await db.delete(storagePath(username, "k1"));
    await db.delete(storagePath(username, "k2"));
    delete process.env.MAX_STORAGE_KEYS;
    delete process.env.MAX_STORAGE_BYTES;
  });

  test("Byte quota counts the replacement delta and preserves the old value on rejection", async function () {
    process.env.MAX_STORAGE_KEYS = "100";
    process.env.MAX_STORAGE_BYTES = "8";

    const res1 = await request(app)
      .put(`/api/v1/storage/a`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "hi" });
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .put(`/api/v1/storage/a`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "hello" });
    expect(res2.status).toBe(200);
    expect(res2.body).toEqual({ success: true });

    const res3 = await request(app)
      .put(`/api/v1/storage/a`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "hello!!" });
    expect(res3.status).toBe(400);
    expect(res3.body.error).toMatch(/storage limit/);

    const after = await request(app)
      .get(`/api/v1/storage/a`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(after.status).toBe(200);
    expect(after.body.value).toBe("hello");

    const res4 = await request(app)
      .put(`/api/v1/storage/b`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ value: "hi" });
    expect(res4.status).toBe(400);
    expect(await db.has(storagePath(username, "b"))).toBe(false);

    await db.delete(storagePath(username, "a"));
    delete process.env.MAX_STORAGE_KEYS;
    delete process.env.MAX_STORAGE_BYTES;
  });
});
