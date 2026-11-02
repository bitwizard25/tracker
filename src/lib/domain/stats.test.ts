import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/domain/stats";

const e = (entryDate: string, weightKg: number) => ({ id: 1, entryDate, weightKg });

describe("computeStats", () => {
  it("returns an empty result for no entries", () => {
    expect(computeStats([], "2026-11-02")).toEqual({
      currentKg: null,
      startKg: null,
      changeKg: null,
      changePct: null,
      daysLogged30: 0,
      streak: 0,
    });
  });

  it("computes current, start and change from date-sorted entries", () => {
    const s = computeStats([e("2026-10-30", 80), e("2026-10-01", 82), e("2026-11-02", 79)], "2026-11-02");
    expect(s.startKg).toBe(82);
    expect(s.currentKg).toBe(79);
    expect(s.changeKg).toBe(-3);
    expect(s.changePct).toBe(-3.66);
  });

  it("rounds change to avoid float noise", () => {
    const s = computeStats([e("2026-11-01", 80.1), e("2026-11-02", 80.4)], "2026-11-02");
    expect(s.changeKg).toBe(0.3);
  });

  it("counts days logged in a 30 day window ending today inclusive", () => {
    const s = computeStats(
      [e("2026-10-03", 80), e("2026-10-04", 80), e("2026-11-02", 80)],
      "2026-11-02",
    );
    // window is 2026-10-04 .. 2026-11-02; 10-03 is outside
    expect(s.daysLogged30).toBe(2);
  });

  it("streak counts consecutive days ending today", () => {
    const s = computeStats(
      [e("2026-10-31", 80), e("2026-11-01", 80), e("2026-11-02", 80), e("2026-10-29", 80)],
      "2026-11-02",
    );
    expect(s.streak).toBe(3);
  });

  it("streak may end yesterday when today is not logged", () => {
    const s = computeStats([e("2026-10-31", 80), e("2026-11-01", 80)], "2026-11-02");
    expect(s.streak).toBe(2);
  });

  it("streak is 0 when neither today nor yesterday is logged", () => {
    expect(computeStats([e("2026-10-30", 80)], "2026-11-02").streak).toBe(0);
  });

  it("ignores future-dated entries for the window and streak", () => {
    const s = computeStats([e("2026-11-03", 80), e("2026-11-02", 80)], "2026-11-02");
    expect(s.streak).toBe(1);
    expect(s.daysLogged30).toBe(1);
  });
});
