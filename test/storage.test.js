import { beforeAll, afterAll, describe, test, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { db, userPath, storagePath } from "../src/db.js";
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
