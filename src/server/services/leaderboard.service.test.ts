import { describe, expect, it } from "vitest";
import { createTestDb } from "@/test/createTestDb";
import { collectKeys, seedUser } from "@/test/socialFixtures";
import { getLeaderboard } from "./leaderboard.service";
import { setSharing } from "./sharing.service";

const TODAY = "2026-03-30";

describe("leaderboard.service.getLeaderboard", () => {
  it("never lists a non-sharing user, and toggling updates immediately", () => {
    const db = createTestDb();
    const viewer = seedUser(db, { name: "Viewer", share: true, entries: [["2026-03-30", 80]] });
    const hidden = seedUser(db, { name: "Hidden", entries: [["2026-03-01", 90], ["2026-03-30", 80]] });
    expect(getLeaderboard(db, viewer, TODAY).map((e) => e.userId)).toEqual([viewer]);
    setSharing(db, hidden, true);
    expect(getLeaderboard(db, viewer, TODAY).map((e) => e.userId)).toContain(hidden);
    setSharing(db, hidden, false);
    expect(getLeaderboard(db, viewer, TODAY).map((e) => e.userId)).toEqual([viewer]);
  });

  it("computes scores from first/latest by date and flags the viewer", () => {
    const db = createTestDb();
    // Inserted out of order: first by date is 100, latest by date is 95 -> 5% loss -> progress 50.
    const a = seedUser(db, {
      name: "Ann",
      share: true,
      entries: [["2026-03-30", 95], ["2026-03-01", 100]],
    });
    const consistency = 6.7;
    expect(getLeaderboard(db, a, TODAY)).toEqual([
      {
        rank: 1,
        userId: a,
        displayName: "Ann",
        progressPct: 50,
        consistencyPct: consistency,
        score: 37,
        isYou: true,
      },
    ]);
  });

  it("uses gain direction for gain goals", () => {
    const db = createTestDb();
    const g = seedUser(db, {
      name: "Gus",
      goalType: "gain",
      share: true,
      entries: [["2026-03-01", 100], ["2026-03-30", 105]],
    });
    expect(getLeaderboard(db, g, TODAY)[0].progressPct).toBe(50);
  });

  it("sorts by score desc with 1-based ranks and isYou", () => {
    const db = createTestDb();
    const low = seedUser(db, { name: "Low", share: true, entries: [["2026-03-01", 100], ["2026-03-30", 100]] });
    const high = seedUser(db, { name: "High", share: true, entries: [["2026-03-01", 100], ["2026-03-30", 90]] });
    expect(getLeaderboard(db, low, TODAY).map((e) => [e.rank, e.userId, e.isYou])).toEqual([
      [1, high, false],
      [2, low, true],
    ]);
  });

  it("breaks exact ties by lower userId", () => {
    const db = createTestDb();
    const entries: [string, number][] = [["2026-03-01", 100], ["2026-03-30", 90]];
    const first = seedUser(db, { name: "A", share: true, entries });
    const second = seedUser(db, { name: "B", share: true, entries });
    expect(getLeaderboard(db, second, TODAY).map((e) => e.userId)).toEqual([first, second]);
  });

  it("breaks equal scores by higher consistency before lower userId", () => {
    const db = createTestDb();
    // B (lower id): 2 days, 0.14286% loss -> progress 1.4286 -> 0.7*1.4286 + 0.3*(2/30*100) = 3.0
    const b = seedUser(db, {
      name: "B",
      share: true,
      entries: [["2026-03-01", 100000], ["2026-03-30", 99857.14]],
    });
    // A (higher id): no progress, 3 days -> 0.3*(3/30*100) = 3.0
    const a = seedUser(db, {
      name: "A",
      share: true,
      entries: [["2026-03-01", 100], ["2026-03-15", 100], ["2026-03-30", 100]],
    });
    const board = getLeaderboard(db, b, TODAY);
    expect(board[0].score).toBe(board[1].score);
    expect(board.map((e) => e.userId)).toEqual([a, b]);
  });

  it("excludes sharing users with zero entries", () => {
    const db = createTestDb();
    const viewer = seedUser(db, { name: "V", share: true, entries: [["2026-03-30", 80]] });
    seedUser(db, { name: "Empty", share: true });
    expect(getLeaderboard(db, viewer, TODAY)).toHaveLength(1);
  });

  it("returns other users' numbers at most 1dp so raw weights cannot be recovered", () => {
    const db = createTestDb();
    const viewer = seedUser(db, { name: "V", share: true, entries: [["2026-03-30", 80]] });
    seedUser(db, { name: "O", share: true, entries: [["2026-03-01", 91.7], ["2026-03-30", 89.3]] });
    const board = getLeaderboard(db, viewer, TODAY);
    const other = board.find((e) => !e.isYou);
    expect(board).toHaveLength(2);
    expect(other?.progressPct).toBe(26.2);
    for (const e of board) {
      for (const n of [e.progressPct, e.consistencyPct, e.score]) {
        expect(Math.round(n * 10) / 10).toBe(n);
      }
    }
  });

  it("exposes exactly the contract keys", () => {
    const db = createTestDb();
    const v = seedUser(db, { name: "V", share: true, entries: [["2026-03-01", 80], ["2026-03-30", 79]] });
    const board = getLeaderboard(db, v, TODAY);
    expect(board).toHaveLength(1);
    expect([...collectKeys(board)].sort()).toEqual(
      ["consistencyPct", "displayName", "isYou", "progressPct", "rank", "score", "userId"].sort(),
    );
  });
});
