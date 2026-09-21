import { beforeAll, describe, test, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { db, userPath } from "../src/db.js";
import { verifyToken } from "../src/tokens.js";

describe("Other endpoints", async function () {
  test("GET /api/v1/ping works", async function () {
    const res = await request(app).get("/api/v1/ping");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("/auth/register", async function () {
  let token;

  beforeAll(async function () {
    await db.delete(userPath("test-user"));
  });
  test("Works normally", async function () {
    const payload = { username: "test-user", password: "test-password" };

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(payload)
      .set("Accept", "application/json");

    // Since it is the first time this user was registered, the call should have been successful

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property("username");
    expect(response.body).to.have.property("token");
    expect(response.body.username).to.equal("test-user");

    token = response.body.token;
  });
  test("That token is correct", async function () {
    process.env.JWT_SECRET = "test-secret";

    const payload = {
      username: "test-user",
    };
    const decodedToken = await verifyToken(token);

    expect(decodedToken.username).toEqual(payload.username);
  });
  test("Fails if an account already exists", async function () {
    const payload = { username: "test-user", password: "test-password" };

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(payload)
      .set("Accept", "application/json");

    // Now it should fail since the user already exists

    expect(response.status).to.equal(400);
    expect(response.body).to.have.property("error");
    expect(response.body.error).to.equal("This user already exists.");
  });
  test("Concurrent registrations: only one succeeds and only it gets a token", async function () {
    const username = "race-user";
    await db.delete(userPath(username));

    const payload = { username, password: "test-password" };
    const responses = await Promise.all([
      request(app).post("/api/v1/auth/register").send(payload),
      request(app).post("/api/v1/auth/register").send(payload),
    ]);

    const ok = responses.filter((res) => res.status === 200);
    const rejected = responses.filter((res) => res.status === 400);

    expect(ok.length).to.equal(1);
    expect(rejected.length).to.equal(1);
    expect(rejected[0].body.error).to.equal("This user already exists.");
  });
});

describe("/auth/login", async function () {
  let token;

  test("Works normally", async function () {
    const payload = { username: "test-user", password: "test-password" };

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(payload)
      .set("Accept", "application/json");

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property("username");
    expect(response.body).to.have.property("token");
    expect(response.body.username).to.equal("test-user");

    token = response.body.token;
  });
  test("That token is correct", async function () {
    process.env.JWT_SECRET = "test-secret";

    const payload = {
      username: "test-user",
    };
    const decodedToken = await verifyToken(token);

    expect(decodedToken.username).toEqual(payload.username);
  });
  test("Fails if an account doesn't exists", async function () {
    const payload = { username: "test-user-2", password: "test-password" };

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send(payload)
      .set("Accept", "application/json");

    // Now it should fail since the user already exists

    expect(response.status).to.equal(401);
    expect(response.body).to.have.property("error");
    expect(response.body.error).to.equal("Incorrect credentials.");
  });
});
