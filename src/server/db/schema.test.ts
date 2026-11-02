import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/test/createTestDb";
import type { Db } from "@/server/db/client";
import { users, weightEntries } from "./schema";

const newUser = (email = "a@example.com") => ({
  email,
  passwordHash: "hash",
  displayName: "Alice",
  goalType: "lose" as const,
});

describe("schema", () => {
  let db: Db;
  beforeEach(() => {
    db = createTestDb();
  });

  it("rejects two entries for the same user and date", () => {
    const [u] = db.insert(users).values(newUser()).returning().all();
    const entry = { userId: u.id, entryDate: "2026-01-01", weightKg: 80 };
    db.insert(weightEntries).values(entry).run();
    expect(() => db.insert(weightEntries).values(entry).run()).toThrow();
  });

  it("cascades entry deletion when a user is deleted", () => {
    const [u] = db.insert(users).values(newUser()).returning().all();
    db.insert(weightEntries)
      .values({ userId: u.id, entryDate: "2026-01-01", weightKg: 80 })
      .run();
    db.delete(users).where(eq(users.id, u.id)).run();
    expect(db.select().from(weightEntries).all()).toHaveLength(0);
  });

  it("defaults share_progress to 0", () => {
    const [u] = db.insert(users).values(newUser()).returning().all();
    expect(u.shareProgress).toBe(false);
    expect(u.shareConsentedAt).toBeNull();
  });

  it("rejects an invalid goal_type", () => {
    const bad = { ...newUser(), goalType: "maintain" as "lose" };
    expect(() => db.insert(users).values(bad).run()).toThrow();
  });
});
