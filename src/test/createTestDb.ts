import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb, type Db } from "@/server/db/client";

export function createTestDb(): Db {
  const db = createDb(":memory:");
  migrate(db, { migrationsFolder: "./src/server/db/migrations" });
  return db;
}
