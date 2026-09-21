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

export { db };
