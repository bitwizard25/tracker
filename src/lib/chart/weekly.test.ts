import { describe, expect, it } from "vitest";
import { weekDomain } from "@/lib/chart/weekly";

describe("weekDomain", () => {
  it("returns null when there is no data", () => {
    expect(weekDomain([])).toBeNull();
  });
  it("pads below the minimum so the axis does not start at the data minimum or zero-based scale", () => {
    const [lo, hi] = weekDomain([90, 91, 92])!;
    expect(lo).toBeLessThan(90);
    expect(hi).toBeGreaterThan(92);
    expect(lo).toBeGreaterThan(0);
  });
  it("handles a single or flat value", () => {
    const [lo, hi] = weekDomain([70, 70])!;
    expect(lo).toBeLessThan(70);
    expect(hi).toBeGreaterThan(70);
  });
});
