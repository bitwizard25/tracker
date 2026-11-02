import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const IN_MEMORY = ":memory:";

export function createDb(filename: string): Db {
  if (filename !== IN_MEMORY) {
    mkdirSync(dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  if (filename !== IN_MEMORY) {
    sqlite.pragma("journal_mode = WAL");
  }
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

let instance: Db | undefined;

export function getDb(): Db {
  instance ??= createDb(process.env.DATABASE_URL ?? "./data/tracker.db");
  return instance;
}
