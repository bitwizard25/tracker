import { describe, expect, it } from "vitest";
import type { Db } from "@/server/db/client";
import { createTestDb } from "@/test/createTestDb";
import { collectKeys, seedUser } from "@/test/socialFixtures";
import { getComparison } from "./compare.service";
import { setSharing } from "./sharing.service";

const TODAY = "2026-03-30";

function sharer(db: Db, name: string, endKg = 90) {
  return seedUser(db, {
    name,
    share: true,
    entries: [["2026-03-01", 100], ["2026-03-30", endKg]],
  });
}

describe("compare.service.getComparison", () => {
  it("never includes a non-sharing user even when requested by id", () => {
    const db = createTestDb();
    const viewer = sharer(db, "Viewer");
    const hidden = seedUser(db, { name: "Hidden", entries: [["2026-03-01", 70]] });
    const result = getComparison(db, viewer, [hidden], TODAY);
    expect(result.map((s) => s.userId)).toEqual([viewer]);
  });

  it("toggling sharing off removes a user immediately and on adds them", () => {
    const db = createTestDb();
    const viewer = sharer(db, "Viewer");
    const other = sharer(db, "Other");
    expect(getComparison(db, viewer, [other], TODAY).map((s) => s.userId)).toEqual([viewer, other]);
    setSharing(db, other, false);
    expect(getComparison(db, viewer, [other], TODAY).map((s) => s.userId)).toEqual([viewer]);
    setSharing(db, other, true);
    expect(getComparison(db, viewer, [other], TODAY).map((s) => s.userId)).toEqual([viewer, other]);
  });

  it("gives a non-sharing viewer their own series first, as percent points", () => {
    const db = createTestDb();
    const viewer = seedUser(db, { name: "Me", entries: [["2026-03-01", 100], ["2026-03-10", 95]] });
    const other = sharer(db, "Other");
    const result = getComparison(db, viewer, [other], TODAY);
    expect(result[0]).toEqual({
      userId: viewer,
      displayName: "Me",
      isYou: true,
      points: [
        { date: "2026-03-01", pct: 0 },
        { date: "2026-03-10", pct: -5 },
      ],
    });
    expect(result[1]).toMatchObject({ userId: other, isYou: false });
  });

  it("omits the viewer series when they have no entries", () => {
    const db = createTestDb();
    const viewer = seedUser(db, { name: "Me" });
    const other = sharer(db, "Other");
    expect(getComparison(db, viewer, [other], TODAY).map((s) => s.userId)).toEqual([other]);
  });

  it("dedupes requested ids and does not duplicate the viewer's own series", () => {
    const db = createTestDb();
    const viewer = sharer(db, "Viewer");
    const other = sharer(db, "Other");
    const result = getComparison(db, viewer, [other, other, viewer, viewer], TODAY);
    expect(result.map((s) => s.userId)).toEqual([viewer, other]);
    expect(result.filter((s) => s.isYou)).toHaveLength(1);
  });

  it("defaults to the top 4 on the leaderboard, excluding the viewer", () => {
    const db = createTestDb();
    const viewer = sharer(db, "Viewer", 80); // best score, must still not appear twice
    const ids = [95, 94, 93, 92, 91].map((kg, i) => sharer(db, `U${i}`, kg));
    const result = getComparison(db, viewer, [], TODAY);
    expect(result.map((s) => s.userId)).toEqual([viewer, ids[4], ids[3], ids[2], ids[1]]);
    expect(result.filter((s) => s.isYou)).toHaveLength(1);
  });

  it("default never includes non-sharing users", () => {
    const db = createTestDb();
    const viewer = sharer(db, "Viewer");
    seedUser(db, { name: "Hidden", entries: [["2026-03-01", 100], ["2026-03-30", 50]] });
    expect(getComparison(db, viewer, [], TODAY).map((s) => s.userId)).toEqual([viewer]);
  });

  it("caps requested others at 5", () => {
    const db = createTestDb();
    const viewer = sharer(db, "Viewer");
    const ids = Array.from({ length: 7 }, (_, i) => sharer(db, `U${i}`));
    const result = getComparison(db, viewer, ids, TODAY);
    expect(result.map((s) => s.userId)).toEqual([viewer, ...ids.slice(0, 5)]);
  });

  it("never exposes weights, emails or hashes", () => {
    const db = createTestDb();
    const viewer = sharer(db, "Viewer");
    const other = sharer(db, "Other");
    const keys = collectKeys(getComparison(db, viewer, [other], TODAY));
    for (const forbidden of ["weightKg", "email", "passwordHash"]) expect(keys.has(forbidden)).toBe(false);
  });
});
