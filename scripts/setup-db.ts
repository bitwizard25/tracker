import { isEphemeralHost } from "../src/server/db/bootstrap";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "../src/server/db/client";
import {
  demoUsersExist,
  replaceDemoUsers,
  shouldSeedDemo,
} from "../src/server/db/demo-data";

if (isEphemeralHost(process.env)) {
  // The runtime database lives in temp storage and bootstraps itself on first use (see src/server/db/bootstrap.ts).
  console.log(
    "Serverless host detected: database is created at runtime, skipping setup",
  );
  process.exit(0);
}

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
