import { describe, expect, it } from "vitest";
import { addDays, localToday, toIsoDate } from "@/lib/domain/dates";

describe("dates", () => {
  it("formats the local calendar day, not the UTC day", () => {
    expect(localToday(new Date(2026, 10, 2, 23, 30))).toBe("2026-11-02");
    expect(localToday(new Date(2026, 10, 2, 0, 5))).toBe("2026-11-02");
  });

  it("zero-pads month and day", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});
