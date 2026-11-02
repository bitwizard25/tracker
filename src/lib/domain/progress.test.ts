import { describe, expect, it } from "vitest";
import { directionalChangePct, toPercentSeries } from "./progress";

describe("toPercentSeries", () => {
  it("returns [] for empty input", () => {
    expect(toPercentSeries([])).toEqual([]);
  });
  it("returns a single zero point for one entry", () => {
    expect(toPercentSeries([{ date: "2026-01-01", weightKg: 80 }])).toEqual([
      { date: "2026-01-01", pct: 0 },
    ]);
  });
  it("computes pct relative to the first entry", () => {
    const out = toPercentSeries([
      { date: "2026-01-01", weightKg: 100 },
      { date: "2026-01-02", weightKg: 95 },
      { date: "2026-01-03", weightKg: 105 },
    ]);
    expect(out.map((p) => p.pct)).toEqual([0, -5, 5]);
  });
  it("sorts unsorted input by date and does not mutate it", () => {
    const input = [
      { date: "2026-01-03", weightKg: 90 },
      { date: "2026-01-01", weightKg: 100 },
      { date: "2026-01-02", weightKg: 95 },
    ];
    const snapshot = structuredClone(input);
    const out = toPercentSeries(input);
    expect(out.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(out[0].pct).toBe(0);
    expect(out[2].pct).toBe(-10);
    expect(input).toEqual(snapshot);
  });
  it("rounds to 2 decimals", () => {
    const out = toPercentSeries([
      { date: "2026-01-01", weightKg: 70 },
      { date: "2026-01-02", weightKg: 69 },
    ]);
    expect(out[1].pct).toBe(-1.43);
  });
});

describe("directionalChangePct", () => {
  it("is positive when losing weight on a lose goal", () => {
    expect(directionalChangePct("lose", 100, 90)).toBe(10);
  });
  it("is negative when gaining weight on a lose goal", () => {
    expect(directionalChangePct("lose", 100, 105)).toBe(-5);
  });
  it("is positive when gaining weight on a gain goal", () => {
    expect(directionalChangePct("gain", 50, 55)).toBe(10);
  });
  it("is negative when losing weight on a gain goal", () => {
    expect(directionalChangePct("gain", 50, 45)).toBe(-10);
  });
  it("is 0 when unchanged", () => {
    expect(directionalChangePct("lose", 80, 80)).toBe(0);
  });
});
