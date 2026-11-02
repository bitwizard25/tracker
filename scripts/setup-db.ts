import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "../src/server/db/client";
import { demoUsersExist, replaceDemoUsers, shouldSeedDemo } from "./demo-data";

// Runs before dev, build and start: apply migrations, then seed demo data only if it is missing.
const db = getDb();
migrate(db, { migrationsFolder: "./src/server/db/migrations" });
console.log("Database ready (migrations applied)");

if (!shouldSeedDemo(process.env)) {
  console.log("Demo data skipped (production, or SEED_DEMO_DATA=false)");
} else if (demoUsersExist(db)) {
  console.log("Demo data already present");
} else {
  replaceDemoUsers(db);
}
