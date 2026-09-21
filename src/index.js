#!/usr/bin/env node

import consola from "consola";
import { app } from "./app.js";
import { configuredLimit } from "./db.js";

/**
 * TODO: Make the API base URL configurable. Please.
 */

// Run checks

if (!process.env.JWT_SECRET) {
  consola.error("JWT_SECRET is needed to create tokens.");
  process.exit(1);
}

if (process.env.JWT_SECRET == "<your-strong-random-secret>") {
  consola.error("You forgot to change JWT_SECRET!");
  process.exit(1);
}

for (const [name, fallback] of [
  ["MAX_STORAGE_KEYS", 100],
  ["MAX_STORAGE_BYTES", 1024 * 1024],
]) {
  try {
    configuredLimit(name, fallback);
  } catch (err) {
    consola.error(err.message);
    process.exit(1);
  }
}

// Listen to me

const port = 4090; // GeForce RTX 4090

app.listen(port, () => {
  consola.info(`MeowDB is now listening on port ${port}!`);
});
