import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapEphemeralDb,
  isEphemeralHost,
  resolveDatabaseFile,
} from "@/server/db/bootstrap";
import { createDb } from "@/server/db/client";
import { users } from "@/server/db/schema";

afterEach(() => vi.restoreAllMocks());

describe("resolveDatabaseFile", () => {
  it("uses DATABASE_URL, falling back to ./data/tracker.db", () => {
    expect(resolveDatabaseFile({ DATABASE_URL: "./x.db" })).toBe("./x.db");
    expect(resolveDatabaseFile({})).toBe("./data/tracker.db");
  });

  it("uses temp storage on Vercel even if DATABASE_URL points at the read-only project folder", () => {
    const file = resolveDatabaseFile({
      VERCEL: "1",
      DATABASE_URL: "./data/tracker.db",
    });
    expect(file).toMatch(/tracker\.db$/);
    expect(file).not.toBe("./data/tracker.db");
    expect(isEphemeralHost({ VERCEL: "1" })).toBe(true);
    expect(isEphemeralHost({})).toBe(false);
  });
});

describe("bootstrapEphemeralDb", () => {
  it("migrates an empty database and seeds the demo users once", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const db = createDb(":memory:");
    bootstrapEphemeralDb(db, {});
    expect(db.select().from(users).all()).toHaveLength(8);
    bootstrapEphemeralDb(db, {});
    expect(db.select().from(users).all()).toHaveLength(8);
  });

  it("migrates but does not seed when SEED_DEMO_DATA=false", () => {
    const db = createDb(":memory:");
    bootstrapEphemeralDb(db, { SEED_DEMO_DATA: "false" });
    expect(db.select().from(users).all()).toHaveLength(0);
  });
});
