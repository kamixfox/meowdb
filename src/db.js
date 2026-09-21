import { QuickDB } from "quick.db";
import consola from "consola";
let db;

export async function initializeDatabase(/* Never shorten names, chums! */) {
  consola.start("Initializing the database, hold on...");
  db = new QuickDB({ filePath: process.env.DB_FILE ?? "meow.sqlite" });
  consola.ready("The database was initialized!");
}

export function sanitizeSegment(segment) {
  return segment.replace(/%/g, "%25").replace(/\./g, "%2E");
}

export function userPath(username) {
  return `users.${sanitizeSegment(username)}`;
}

export function storagePath(username, key) {
  return `storage.${sanitizeSegment(username)}.${sanitizeSegment(key)}`;
}

export async function createUserIfAbsent(username, value) {
  const database = db.driver.database;
  const transaction = database.transaction((user) => {
    const row = database
      .prepare("SELECT json FROM json WHERE ID = ?")
      .get("users");
    const users = row ? JSON.parse(row.json) : {};
    if (users[user.username] != null) {
      return false;
    }
    users[user.username] = {
      username: user.username,
      passwordHash: user.passwordHash,
    };
    database
      .prepare(
        "INSERT INTO json (ID, json) VALUES (?, ?) ON CONFLICT(ID) DO UPDATE SET json = excluded.json",
      )
      .run("users", JSON.stringify(users));
    return true;
  });
  return transaction(value);
}

export { db };
