import { describe, expect, it, vi } from "vitest";
import {
  demoUsersExist,
  replaceDemoUsers,
  shouldSeedDemo,
} from "../../scripts/demo-data";
import { users } from "@/server/db/schema";
import { createTestDb } from "./createTestDb";

describe("demo data", () => {
  it("seeds 8 demo users (6 sharing) into an empty database", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const db = createTestDb();
    expect(demoUsersExist(db)).toBe(false);

    replaceDemoUsers(db);

    const all = db.select().from(users).all();
    expect(all).toHaveLength(8);
    expect(all.filter((u) => u.shareProgress)).toHaveLength(6);
    expect(demoUsersExist(db)).toBe(true);
    vi.restoreAllMocks();
  });

  it("reseeding replaces demo users without duplicating them", () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const db = createTestDb();
    replaceDemoUsers(db);
    replaceDemoUsers(db);
    expect(db.select().from(users).all()).toHaveLength(8);
    vi.restoreAllMocks();
  });
});

describe("shouldSeedDemo", () => {
  it("seeds outside production by default", () => {
    expect(shouldSeedDemo({})).toBe(true);
    expect(shouldSeedDemo({ NODE_ENV: "development" })).toBe(true);
  });

  it("does not seed in production unless forced", () => {
    expect(shouldSeedDemo({ NODE_ENV: "production" })).toBe(false);
    expect(
      shouldSeedDemo({ NODE_ENV: "production", SEED_DEMO_DATA: "true" }),
    ).toBe(true);
  });

  it("can be disabled explicitly", () => {
    expect(shouldSeedDemo({ SEED_DEMO_DATA: "false" })).toBe(false);
  });
});
