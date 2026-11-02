import { describe, expect, it } from "vitest";
import { createTestDb } from "@/test/createTestDb";
import { createUser } from "./user.repository";
import { deleteEntry, listByUser, listByUserBetween, updateWeight, upsertEntry } from "./weight.repository";

function setup() {
  const db = createTestDb();
  const mk = (email: string) =>
    createUser(db, { email, passwordHash: "h", displayName: "User", goalType: "lose" }).id;
  return { db, a: mk("a@b.co"), b: mk("b@b.co") };
}

describe("weight.repository", () => {
  it("upsertEntry reports created then updated for the same date", () => {
    const { db, a } = setup();
    const first = upsertEntry(db, a, "2026-01-01", 80);
    expect(first.created).toBe(true);
    expect(first.entry).toEqual({ id: expect.any(Number), entryDate: "2026-01-01", weightKg: 80 });
    const second = upsertEntry(db, a, "2026-01-01", 79.5);
    expect(second.created).toBe(false);
    expect(second.entry).toEqual({ id: first.entry.id, entryDate: "2026-01-01", weightKg: 79.5 });
    expect(listByUser(db, a)).toHaveLength(1);
  });

  it("lets two users log the same date independently", () => {
    const { db, a, b } = setup();
    expect(upsertEntry(db, a, "2026-01-01", 80).created).toBe(true);
    expect(upsertEntry(db, b, "2026-01-01", 60).created).toBe(true);
  });

  it("listByUser returns only own entries ordered by date asc", () => {
    const { db, a, b } = setup();
    upsertEntry(db, a, "2026-01-03", 79);
    upsertEntry(db, a, "2026-01-01", 80);
    upsertEntry(db, b, "2026-01-02", 60);
    expect(listByUser(db, a).map((e) => e.entryDate)).toEqual(["2026-01-01", "2026-01-03"]);
  });

  it("updateWeight changes only the owner's row", () => {
    const { db, a, b } = setup();
    const { entry } = upsertEntry(db, a, "2026-01-01", 80);
    expect(updateWeight(db, b, entry.id, 1)).toBeUndefined();
    expect(listByUser(db, a)[0].weightKg).toBe(80);
    expect(updateWeight(db, a, entry.id, 78)).toEqual({ ...entry, weightKg: 78 });
  });

  it("deleteEntry removes only the owner's row", () => {
    const { db, a, b } = setup();
    const { entry } = upsertEntry(db, a, "2026-01-01", 80);
    expect(deleteEntry(db, b, entry.id)).toBe(false);
    expect(listByUser(db, a)).toHaveLength(1);
    expect(deleteEntry(db, a, entry.id)).toBe(true);
    expect(deleteEntry(db, a, entry.id)).toBe(false);
    expect(listByUser(db, a)).toHaveLength(0);
  });

  describe("listByUserBetween", () => {
    const seed = () => {
      const s = setup();
      for (const d of ["2026-01-05", "2026-01-01", "2026-01-03", "2026-01-07"]) {
        upsertEntry(s.db, s.a, d, 80);
      }
      upsertEntry(s.db, s.b, "2026-01-03", 60);
      return s;
    };
    const dates = (es: { entryDate: string }[]) => es.map((e) => e.entryDate);

    it("includes both boundaries and orders ascending", () => {
      const { db, a } = seed();
      expect(dates(listByUserBetween(db, a, { from: "2026-01-03", to: "2026-01-05" }))).toEqual([
        "2026-01-03",
        "2026-01-05",
      ]);
    });
    it("supports only-from and only-to", () => {
      const { db, a } = seed();
      expect(dates(listByUserBetween(db, a, { from: "2026-01-05" }))).toEqual([
        "2026-01-05",
        "2026-01-07",
      ]);
      expect(dates(listByUserBetween(db, a, { to: "2026-01-03" }))).toEqual([
        "2026-01-01",
        "2026-01-03",
      ]);
    });
    it("returns everything without a range and nothing for an empty range", () => {
      const { db, a } = seed();
      expect(listByUserBetween(db, a)).toHaveLength(4);
      expect(listByUserBetween(db, a, { from: "2026-02-01", to: "2026-02-07" })).toEqual([]);
    });
    it("never returns another user's entries", () => {
      const { db, b } = seed();
      const rows = listByUserBetween(db, b, { from: "2026-01-01", to: "2026-01-31" });
      expect(rows).toHaveLength(1);
      expect(rows[0].weightKg).toBe(60);
    });
  });
});
