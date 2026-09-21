import { test, expect } from "vitest";
import { generateToken, verifyToken } from "../src/tokens.js";

test("Generated tokens are correct", async function () {
  process.env.JWT_SECRET = "test-secret";

  const payload = {
    username: "test-user",
  };
  const token = await generateToken(payload);
  const decodedToken = await verifyToken(token);

  expect(decodedToken.username).toEqual(payload.username);
});
