import { drizzle } from "drizzle-orm/d1";
import * as schema from "../drizzle-out/schema";

let db: ReturnType<typeof drizzle<typeof schema>>; // updated to use the schema

export function initDatabase(bindingDb: D1Database) {
  db = drizzle(bindingDb);
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}
