import { describe, expect, it } from "vitest";
import { addDays, todayUtc } from "./date";

describe("addDays", () => {
  it("adds and subtracts days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-03-10", 0)).toBe("2026-03-10");
  });
});

describe("todayUtc", () => {
  it("returns the current UTC date as YYYY-MM-DD", () => {
    expect(todayUtc()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayUtc()).toBe(new Date().toISOString().slice(0, 10));
  });
});
