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

export async function setStorageValueIfAllowed(username, key, value, maxKeys) {
  const account = sanitizeSegment(username);
  const storageKey = sanitizeSegment(key);
  const database = db.driver.database;
  const maxBytes = Number(process.env.MAX_STORAGE_BYTES) || 1024 * 1024;
  const transaction = database.transaction((acc, k, v, maxK, maxB) => {
    const row = database
      .prepare("SELECT json FROM json WHERE ID = ?")
      .get("storage");
    const allStorage = row ? JSON.parse(row.json) : {};
    const store = allStorage[acc] ?? {};
    const exists = Object.prototype.hasOwnProperty.call(store, k);
    const totalKeys = Object.keys(store).length;
    const candidate = { ...store, [k]: v };
    const projectedBytes = Buffer.byteLength(JSON.stringify(candidate), "utf8");
    if (!exists && totalKeys >= maxK) {
      return {
        ok: false,
        error: `This account cannot store more than ${maxK} keys.`,
      };
    }
    if (projectedBytes > maxB) {
      return {
        ok: false,
        error: `This account exceeds the ${maxB} byte storage limit.`,
      };
    }
    Object.defineProperty(store, k, {
      value: v,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    allStorage[acc] = store;
    database
      .prepare(
        "INSERT INTO json (ID, json) VALUES (?, ?) ON CONFLICT(ID) DO UPDATE SET json = excluded.json",
      )
      .run("storage", JSON.stringify(allStorage));
    return { ok: true };
  });
  return transaction(account, storageKey, value, maxKeys, maxBytes);
}

export { db };
