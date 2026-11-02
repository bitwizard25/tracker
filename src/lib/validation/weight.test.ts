import { describe, expect, it } from "vitest";
import { createWeightSchema, updateWeightSchema } from "./weight";

describe("createWeightSchema", () => {
  it("accepts a valid entry and rounds weight to 2 decimals", () => {
    expect(createWeightSchema.parse({ entryDate: "2026-02-28", weightKg: 70.456 })).toEqual({
      entryDate: "2026-02-28",
      weightKg: 70.46,
    });
  });
  it("accepts a leap day", () => {
    expect(createWeightSchema.safeParse({ entryDate: "2024-02-29", weightKg: 70 }).success).toBe(true);
  });
  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "2026-1-1", "20260101", "abc"])(
    "rejects invalid date %s",
    (entryDate) => {
      expect(createWeightSchema.safeParse({ entryDate, weightKg: 70 }).success).toBe(false);
    },
  );
  it.each([19.99, 500.01, 0, -5, Number.NaN])("rejects weight %s", (weightKg) => {
    expect(createWeightSchema.safeParse({ entryDate: "2026-01-01", weightKg }).success).toBe(false);
  });
  it("accepts boundary weights 20 and 500", () => {
    expect(createWeightSchema.safeParse({ entryDate: "2026-01-01", weightKg: 20 }).success).toBe(true);
    expect(createWeightSchema.safeParse({ entryDate: "2026-01-01", weightKg: 500 }).success).toBe(true);
  });
  it("rejects string weight", () => {
    expect(createWeightSchema.safeParse({ entryDate: "2026-01-01", weightKg: "70" }).success).toBe(false);
  });
});

describe("updateWeightSchema", () => {
  it("accepts and rounds weight", () => {
    expect(updateWeightSchema.parse({ weightKg: 80.126 })).toEqual({ weightKg: 80.13 });
  });
  it("rejects out of range", () => {
    expect(updateWeightSchema.safeParse({ weightKg: 5 }).success).toBe(false);
  });
});
