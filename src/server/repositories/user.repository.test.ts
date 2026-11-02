import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { createTestDb } from "@/test/createTestDb";
import { createUser, findByEmail, findById, setSharing } from "./user.repository";

const base = {
  email: "a@b.co",
  passwordHash: "hash",
  displayName: "Raj",
  goalType: "lose" as const,
  goalWeightKg: 70,
};

function sharingRow(db: Db, id: number) {
  return db
    .select({ shareProgress: users.shareProgress, shareConsentedAt: users.shareConsentedAt })
    .from(users)
    .where(eq(users.id, id))
    .get();
}

describe("user.repository", () => {
  it("creates a user with sharing off by default and no password hash in the result", () => {
    const db = createTestDb();
    const user = createUser(db, base);
    expect(user).toEqual({
      id: expect.any(Number),
      email: "a@b.co",
      displayName: "Raj",
      goalType: "lose",
      goalWeightKg: 70,
      shareProgress: false,
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("stores a null goal weight when omitted", () => {
    const db = createTestDb();
    expect(createUser(db, { ...base, goalWeightKg: undefined }).goalWeightKg).toBeNull();
  });

  it("findByEmail returns the credentials record including the hash", () => {
    const db = createTestDb();
    createUser(db, base);
    const found = findByEmail(db, "a@b.co");
    expect(found?.passwordHash).toBe("hash");
    expect(found?.user.email).toBe("a@b.co");
    expect(found?.user).not.toHaveProperty("passwordHash");
    expect(findByEmail(db, "none@b.co")).toBeUndefined();
  });

  it("findById returns a public user or undefined", () => {
    const db = createTestDb();
    const { id } = createUser(db, base);
    const found = findById(db, id);
    expect(found).toMatchObject({ id, email: "a@b.co" });
    expect(found).not.toHaveProperty("passwordHash");
    expect(findById(db, 999)).toBeUndefined();
  });

  it("setSharing toggles share_progress and the consent timestamp", () => {
    const db = createTestDb();
    const { id } = createUser(db, base);
    expect(setSharing(db, id, true)?.shareProgress).toBe(true);
    const on = sharingRow(db, id);
    expect(on?.shareProgress).toBe(true);
    expect(Number.isNaN(Date.parse(on?.shareConsentedAt ?? ""))).toBe(false);

    expect(setSharing(db, id, false)?.shareProgress).toBe(false);
    expect(sharingRow(db, id)).toEqual({ shareProgress: false, shareConsentedAt: null });
  });

  it("setSharing returns undefined for an unknown user", () => {
    expect(setSharing(createTestDb(), 5, true)).toBeUndefined();
  });
});
