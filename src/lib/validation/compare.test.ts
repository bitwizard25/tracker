import { describe, expect, it } from "vitest";
import { compareQuerySchema } from "./compare";

describe("compareQuerySchema", () => {
  it("parses a comma-separated list of ids", () => {
    expect(compareQuerySchema.parse({ userIds: "1,2, 3" })).toEqual({ userIds: [1, 2, 3] });
  });
  it("defaults to an empty list when absent or empty", () => {
    expect(compareQuerySchema.parse({})).toEqual({ userIds: [] });
    expect(compareQuerySchema.parse({ userIds: "" })).toEqual({ userIds: [] });
  });
  it("accepts exactly 5 ids", () => {
    expect(compareQuerySchema.safeParse({ userIds: "1,2,3,4,5" }).success).toBe(true);
  });
  it.each(["1,2,3,4,5,6", "0", "-1", "1.5", "a", "1,,2"])("rejects %s", (userIds) => {
    expect(compareQuerySchema.safeParse({ userIds }).success).toBe(false);
  });
});
