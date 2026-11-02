import { describe, expect, it } from "vitest";
import {
  addWeeks,
  formatWeekRange,
  isCurrentWeek,
  weekDays,
  weekEnd,
  weekStart,
  weekSummary,
} from "@/lib/domain/weeks";

const e = (entryDate: string, weightKg: number, id = 1) => ({ id, entryDate, weightKg });

describe("weekStart", () => {
  it("returns Monday for any weekday", () => {
    expect(weekStart("2025-10-27")).toBe("2025-10-27"); // Monday
    expect(weekStart("2025-10-29")).toBe("2025-10-27");
    expect(weekStart("2025-11-02")).toBe("2025-10-27"); // Sunday belongs to previous Monday
    expect(weekStart("2025-11-03")).toBe("2025-11-03");
  });
  it("crosses month and year boundaries", () => {
    expect(weekStart("2026-01-01")).toBe("2025-12-29");
    expect(weekStart("2025-03-02")).toBe("2025-02-24");
  });
  it("handles leap day", () => {
    expect(weekStart("2024-02-29")).toBe("2024-02-26");
    expect(weekStart("2024-03-03")).toBe("2024-02-26");
  });
});

describe("weekDays / weekEnd / addWeeks", () => {
  it("lists 7 days Monday to Sunday", () => {
    expect(weekDays("2024-02-26")).toEqual([
      "2024-02-26", "2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01", "2024-03-02", "2024-03-03",
    ]);
    expect(weekEnd("2025-12-29")).toBe("2026-01-04");
  });
  it("adds and subtracts weeks", () => {
    expect(addWeeks("2025-12-29", 1)).toBe("2026-01-05");
    expect(addWeeks("2025-12-29", -1)).toBe("2025-12-22");
    expect(addWeeks("2025-12-29", 0)).toBe("2025-12-29");
  });
});

describe("formatWeekRange", () => {
  it("omits the year within the current year", () => {
    expect(formatWeekRange("2025-10-27", 2025)).toBe("Oct 27 – Nov 2");
  });
  it("shows years when crossing years", () => {
    expect(formatWeekRange("2025-12-29", 2025)).toBe("Dec 29, 2025 – Jan 4, 2026");
  });
  it("shows the year when not the current year", () => {
    expect(formatWeekRange("2024-02-26", 2025)).toBe("Feb 26 – Mar 3, 2024");
  });
});

describe("isCurrentWeek", () => {
  it("is true for the week containing today", () => {
    expect(isCurrentWeek("2025-10-27", "2025-11-02")).toBe(true);
    expect(isCurrentWeek("2025-10-27", "2025-11-03")).toBe(false);
    expect(isCurrentWeek("2025-10-20", "2025-10-27")).toBe(false);
  });
});

describe("weekSummary", () => {
  const start = "2025-10-27";
  it("handles an empty week", () => {
    const s = weekSummary([], start, "2025-11-05");
    expect(s.days).toHaveLength(7);
    expect(s.loggedCount).toBe(0);
    expect(s.average).toBeNull();
    expect(s.min).toBeNull();
    expect(s.max).toBeNull();
    expect(s.changeFirstToLast).toBeNull();
    expect(s.days.every((d) => d.entry === null && !d.isFuture)).toBe(true);
  });
  it("summarises a partial week and ignores entries outside it", () => {
    const s = weekSummary(
      [e("2025-10-26", 99, 1), e("2025-10-27", 91, 2), e("2025-10-29", 90, 3), e("2025-10-31", 89, 4), e("2025-11-03", 80, 5)],
      start,
      "2025-11-05",
    );
    expect(s.loggedCount).toBe(3);
    expect(s.average).toBeCloseTo(90, 5);
    expect(s.min).toBe(89);
    expect(s.max).toBe(91);
    expect(s.changeFirstToLast).toBeCloseTo(-2, 5);
    expect(s.days[2].entry?.id).toBe(3);
  });
  it("has null change with a single entry", () => {
    const s = weekSummary([e("2025-10-28", 70)], start, "2025-11-05");
    expect(s.loggedCount).toBe(1);
    expect(s.changeFirstToLast).toBeNull();
    expect(s.average).toBe(70);
  });
  it("marks future days and drops their entries", () => {
    const s = weekSummary([e("2025-10-29", 90, 1), e("2025-10-31", 95, 2)], start, "2025-10-29");
    expect(s.days.map((d) => d.isFuture)).toEqual([false, false, false, true, true, true, true]);
    expect(s.loggedCount).toBe(1);
  });
  it("orders unsorted input by date for change", () => {
    const s = weekSummary([e("2025-10-30", 88, 2), e("2025-10-27", 90, 1)], start, "2025-11-02");
    expect(s.changeFirstToLast).toBeCloseTo(-2, 5);
  });
});
