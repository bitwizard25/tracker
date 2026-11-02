import { describe, expect, it } from "vitest";
import { buildScales, nearestIndex, paddedExtent } from "@/lib/chart/scales";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("paddedExtent", () => {
  it("pads the range by 8% on each side", () => {
    const [lo, hi] = paddedExtent([80, 90]);
    expect(lo).toBeCloseTo(79.2);
    expect(hi).toBeCloseTo(90.8);
  });

  it("gives a flat series a non-zero range", () => {
    const [lo, hi] = paddedExtent([80, 80]);
    expect(lo).toBeLessThan(80);
    expect(hi).toBeGreaterThan(80);
  });

  it("falls back to a default range for no values", () => {
    const [lo, hi] = paddedExtent([]);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("buildScales", () => {
  const series = [
    { points: [{ x: d("2026-10-01"), y: 80 }, { x: d("2026-10-31"), y: 78 }] },
    { points: [{ x: d("2026-10-10"), y: 90 }] },
  ];

  it("maps the x extent to the plot width and y to an inverted height", () => {
    const { x, y } = buildScales(series, 400, 200);
    expect(x(d("2026-10-01"))).toBe(0);
    expect(x(d("2026-10-31"))).toBe(400);
    expect(y(y.domain()[0])).toBe(200);
    expect(y(y.domain()[1])).toBe(0);
  });

  it("widens a single-day domain so one point is drawn mid-plot", () => {
    const { x } = buildScales([{ points: [{ x: d("2026-10-10"), y: 80 }] }], 400, 200);
    expect(x(d("2026-10-10"))).toBeCloseTo(200);
  });

  it("includes extra y values (goal line) in the domain", () => {
    const { y } = buildScales(series, 400, 200, [70]);
    expect(y.domain()[0]).toBeLessThan(70);
  });
});

describe("nearestIndex", () => {
  const pts = [
    { x: d("2026-10-01"), y: 1 },
    { x: d("2026-10-05"), y: 2 },
    { x: d("2026-10-20"), y: 3 },
  ];
  it("picks the closest point by x", () => {
    expect(nearestIndex(pts, d("2026-10-02"))).toBe(0);
    expect(nearestIndex(pts, d("2026-10-04"))).toBe(1);
    expect(nearestIndex(pts, d("2026-12-01"))).toBe(2);
    expect(nearestIndex(pts, d("2026-01-01"))).toBe(0);
  });
  it("returns -1 for no points", () => {
    expect(nearestIndex([], d("2026-10-02"))).toBe(-1);
  });
});
