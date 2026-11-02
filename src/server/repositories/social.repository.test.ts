import { describe, expect, it } from "vitest";
import { createTestDb } from "@/test/createTestDb";
import { seedUser } from "@/test/socialFixtures";
import { setSharing } from "./user.repository";
import { listSharingUsersWithEntries } from "./social.repository";

describe("social.repository.listSharingUsersWithEntries", () => {
  it("returns only users with share_progress = 1", () => {
    const db = createTestDb();
    const yes = seedUser(db, { name: "Yes", share: true, entries: [["2026-03-01", 80]] });
    seedUser(db, { name: "No", entries: [["2026-03-01", 70]] });
    const result = listSharingUsersWithEntries(db);
    expect(result.map((u) => u.userId)).toEqual([yes]);
    expect(result[0].displayName).toBe("Yes");
  });

  it("orders entries by date regardless of insertion order", () => {
    const db = createTestDb();
    seedUser(db, {
      name: "Yes",
      share: true,
      entries: [["2026-03-05", 78], ["2026-03-01", 80], ["2026-03-03", 79]],
    });
    expect(listSharingUsersWithEntries(db)[0].entries.map((e) => e.date)).toEqual([
      "2026-03-01",
      "2026-03-03",
      "2026-03-05",
    ]);
  });

  it("includes sharing users with no entries, and reflects toggles immediately", () => {
    const db = createTestDb();
    const id = seedUser(db, { name: "Yes", share: true });
    expect(listSharingUsersWithEntries(db)).toEqual([
      { userId: id, displayName: "Yes", goalType: "lose", entries: [] },
    ]);
    setSharing(db, id, false);
    expect(listSharingUsersWithEntries(db)).toEqual([]);
    setSharing(db, id, true);
    expect(listSharingUsersWithEntries(db)).toHaveLength(1);
  });

  it("exposes no email or password hash", () => {
    const db = createTestDb();
    seedUser(db, { name: "Yes", share: true, entries: [["2026-03-01", 80]] });
    expect(Object.keys(listSharingUsersWithEntries(db)[0]).sort()).toEqual([
      "displayName",
      "entries",
      "goalType",
      "userId",
    ]);
  });
});
