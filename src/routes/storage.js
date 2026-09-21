import { Router } from "express";
import consola from "consola";
import { storagePath, db } from "../db.js";

export const storageRouter = Router();

storageRouter.put("/:key", async (req, res) => {
  const key = req.params.key;
  consola.log(`- Got a PUT request: storage/${key}.`);
  const value = req.body.value;
  consola.log("  Value to be written: " + value);

  await db.set(storagePath(req.user.username, key), value);
  consola.info("Wrote to the key.");

  return res.json({
    success: true,
  });
});

storageRouter.get("/:key", async (req, res) => {
  const key = req.params.key;
  consola.log(`- Got a GET request: storage/${key}.`);

  if (!(await db.has(storagePath(req.user.username, key)))) {
    return res
      .status(404)
      .json({ exists: false, error: "This key does not exist." });
  }

  const value = await db.get(storagePath(req.user.username, key));
  consola.info("Read the key.");

  return res.json({
    key: key,
    value: value,
    exists: true,
  });
});

storageRouter.delete("/:key", async (req, res) => {
  const key = req.params.key;
  consola.log(`- Got a DELETE request: storage/${key}.`);

  if (!(await db.has(storagePath(req.user.username, key)))) {
    return res
      .status(404)
      .json({ exists: false, error: "This key does not exist." });
  }

  await db.delete(storagePath(req.user.username, key));

  consola.info("Removed the key.");
  return res.json({
    success: true,
  });
});
