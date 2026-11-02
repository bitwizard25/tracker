import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Db } from "./client";
import { demoUsersExist, replaceDemoUsers } from "./demo-data";

export const MIGRATIONS_FOLDER = "./src/server/db/migrations";

type Env = Record<string, string | undefined>;

/**
 * Serverless hosts such as Vercel have a read-only filesystem except for the temp directory,
 * and that directory is wiped on cold starts and is not shared between instances.
 */
export function isEphemeralHost(env: Env): boolean {
  return Boolean(env.VERCEL);
}

export function resolveDatabaseFile(env: Env): string {
  if (isEphemeralHost(env)) return join(tmpdir(), "tracker.db");
  return env.DATABASE_URL ?? "./data/tracker.db";
}

/** Ephemeral databases start empty on every cold start: migrate and (unless disabled) seed demo users. */
export function bootstrapEphemeralDb(db: Db, env: Env): void {
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  if (env.SEED_DEMO_DATA !== "false" && !demoUsersExist(db))
    replaceDemoUsers(db);
}
