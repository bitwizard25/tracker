import { describe, expect, it } from "vitest";
import { latestPct, toLineSeries, YOU_COLOR } from "@/lib/chart/compareSeries";
import type { CompareSeries } from "@/lib/types";

const series = (userId: number, isYou = false): CompareSeries => ({
  userId,
  displayName: isYou ? "Me Myself" : `User ${userId}`,
  isYou,
  points: [
    { date: "2026-10-01", pct: 0 },
    { date: "2026-10-02", pct: -1.5 },
  ],
});

describe("toLineSeries", () => {
  it("returns an empty list for empty input", () => {
    expect(toLineSeries([])).toEqual([]);
  });

  it("labels and emphasizes only the viewer's own series", () => {
    const [mine, other] = toLineSeries([series(1, true), series(2)]);
    expect(mine).toMatchObject({ id: "user-1", label: "You", color: YOU_COLOR, emphasized: true });
    expect(other).toMatchObject({ id: "user-2", label: "User 2" });
    expect(other.emphasized).toBeFalsy();
    expect(other.color).not.toBe(YOU_COLOR);
  });

  it("never leaks the viewer's display name into the label", () => {
    expect(toLineSeries([series(1, true)])[0].label).toBe("You");
  });

  it("converts date strings to UTC midnight Dates", () => {
    const [mine] = toLineSeries([series(1, true)]);
    expect(mine.points[0].x.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(mine.points[1].y).toBe(-1.5);
  });

  it("keeps colors stable when the input is reordered", () => {
    const a = toLineSeries([series(1, true), series(7), series(3), series(9)]);
    const b = toLineSeries([series(9), series(3), series(1, true), series(7)]);
    const colorOf = (list: typeof a, id: string) => list.find((s) => s.id === id)?.color;
    for (const id of ["user-1", "user-3", "user-7", "user-9"]) {
      expect(colorOf(a, id)).toBe(colorOf(b, id));
    }
  });

  it("keeps colors stable when a series is toggled off, given the full universe", () => {
    const universe = [1, 3, 7, 9];
    const all = toLineSeries([series(1, true), series(3), series(7), series(9)], universe);
    const fewer = toLineSeries([series(1, true), series(7), series(9)], universe);
    expect(fewer.find((s) => s.id === "user-9")?.color).toBe(
      all.find((s) => s.id === "user-9")?.color,
    );
  });

  it("gives distinct colors to up to five other users", () => {
    const others = [2, 3, 4, 5, 6].map((id) => series(id));
    const colors = toLineSeries([series(1, true), ...others]).map((s) => s.color);
    expect(new Set(colors).size).toBe(6);
  });
});

describe("latestPct", () => {
  it("returns the last point's pct, or null when there are no points", () => {
    expect(latestPct(series(1))).toBe(-1.5);
    expect(latestPct({ ...series(1), points: [] })).toBeNull();
  });
});
