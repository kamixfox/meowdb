import { test, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/passwords.js";

test("Hashed passwords are correct", async function () {
  const password = "plaintextPassword";
  const passwordHash = await hashPassword(password);

  expect(await verifyPassword(password, passwordHash)).toBe(true);
});
