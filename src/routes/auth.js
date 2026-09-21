import { Router } from "express";
import consola from "consola";
import { userPath, db } from "../db.js";
import { hashPassword, verifyPassword } from "../passwords.js";
import { generateToken } from "../tokens.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  consola.log("- Got a POST request: auth/register.");
  const data = req.body;
  consola.log("  Request: " + JSON.stringify(data));

  if (!data.username) {
    return res.status(400).json({ error: "No username was supplied." }); // res.json replies with JSON
  }
  if (!data.password) {
    return res.status(400).json({ error: "No password was supplied." });
  }
  if (await db.has(userPath(data.username))) {
    return res.status(400).json({ error: "This user already exists." });
  }

  consola.log("  Hashing the password...");
  const hashedPassword = await hashPassword(data.password);
  consola.log("  Writing the user data...");
  await db.set(userPath(data.username), {
    username: data.username,
    passwordHash: hashedPassword,
  });

  consola.log("  Generating the user a token...");
  const payload = {
    username: data.username,
  };

  consola.info(`${data.username} registered an account.`);
  return res.json({
    username: data.username,
    token: await generateToken(payload),
  });
});

authRouter.post("/login", async (req, res) => {
  consola.log("- Got a POST request: auth/login.");
  const data = req.body;
  consola.log("  Request: " + JSON.stringify(data));

  if (!data.username) {
    return res.status(400).json({ error: "No username was supplied." });
  }
  if (!data.password) {
    return res.status(400).json({ error: "No password was supplied." });
  }
  if (!(await db.has(userPath(data.username)))) {
    return res.status(401).json({ error: "Incorrect credentials." }); // Don't let the client know the username isn't right...
  }

  consola.log("  Getting user record...");
  const user = await db.get(userPath(data.username));

  if (!(await verifyPassword(data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect credentials." });
  }

  consola.log("  Generating the user a token...");
  const payload = {
    username: data.username,
  };

  consola.info(`${data.username} logged in.`);
  return res.json({
    username: data.username,
    token: await generateToken(payload),
  });
});
