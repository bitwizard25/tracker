import { describe, expect, it } from "vitest";
import {
  PROGRESS_CAP_PCT,
  WEIGHTS,
  WINDOW_DAYS,
  consistencyScore,
  leaderboardScore,
  progressScore,
} from "./scoring";

describe("constants", () => {
  it("match the spec", () => {
    expect(PROGRESS_CAP_PCT).toBe(10);
    expect(WINDOW_DAYS).toBe(30);
    expect(WEIGHTS).toEqual({ progress: 0.7, consistency: 0.3 });
  });
});

describe("progressScore", () => {
  it("scales linearly up to the cap", () => {
    expect(progressScore(5)).toBe(50);
    expect(progressScore(2.5)).toBe(25);
  });
  it("clamps negative change to 0", () => {
    expect(progressScore(-3)).toBe(0);
  });
  it("is 0 at 0", () => {
    expect(progressScore(0)).toBe(0);
  });
  it("caps at 100", () => {
    expect(progressScore(10)).toBe(100);
    expect(progressScore(25)).toBe(100);
  });
});

describe("consistencyScore", () => {
  const today = "2026-03-31";
  it("is 0 for no dates", () => {
    expect(consistencyScore([], today)).toBe(0);
  });
  it("counts a single day as 1/30", () => {
    expect(consistencyScore([today], today)).toBeCloseTo(100 / 30, 10);
  });
  it("counts duplicate dates once", () => {
    expect(consistencyScore([today, today, today], today)).toBeCloseTo(100 / 30, 10);
  });
  it("includes today-29 but excludes today-30", () => {
    expect(consistencyScore(["2026-03-02"], today)).toBeCloseTo(100 / 30, 10);
    expect(consistencyScore(["2026-03-01"], today)).toBe(0);
  });
  it("excludes future dates", () => {
    expect(consistencyScore(["2026-04-01"], today)).toBe(0);
  });
  it("is 100 for a full window and capped at 100", () => {
    const all = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 2, 31 - i));
      return d.toISOString().slice(0, 10);
    });
    expect(consistencyScore(all, today)).toBe(100);
    expect(consistencyScore([...all, "2026-03-01", "2026-04-02"], today)).toBe(100);
  });
  it("handles month and year boundaries", () => {
    expect(consistencyScore(["2025-12-03"], "2026-01-01")).toBeCloseTo(100 / 30, 10);
    expect(consistencyScore(["2025-12-02"], "2026-01-01")).toBe(0);
  });
});

describe("leaderboardScore", () => {
  it("weights 70/30", () => {
    expect(leaderboardScore(100, 100)).toBe(100);
    expect(leaderboardScore(100, 0)).toBe(70);
    expect(leaderboardScore(0, 100)).toBe(30);
  });
  it("rounds to 1 decimal", () => {
    expect(leaderboardScore(33.333, 3.333)).toBe(24.3);
    expect(leaderboardScore(50, 100 / 30)).toBe(36);
  });
});
