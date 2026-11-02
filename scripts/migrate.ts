import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "../src/server/db/client";

migrate(getDb(), { migrationsFolder: "./src/server/db/migrations" });
console.log("Migrations applied");
