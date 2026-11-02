import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "../src/server/db/client";
import { replaceDemoUsers } from "../src/server/db/demo-data";

// Explicit reseed: always recreates the demo users (and only the demo users).
const db = getDb();
migrate(db, { migrationsFolder: "./src/server/db/migrations" });
replaceDemoUsers(db);
