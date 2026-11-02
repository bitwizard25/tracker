import { describe, expect, it } from "vitest";
import { sharingSchema } from "./sharing";

describe("sharingSchema", () => {
  it("accepts booleans", () => {
    expect(sharingSchema.parse({ share: true })).toEqual({ share: true });
    expect(sharingSchema.parse({ share: false })).toEqual({ share: false });
  });
  it("rejects non-booleans and missing", () => {
    expect(sharingSchema.safeParse({ share: "yes" }).success).toBe(false);
    expect(sharingSchema.safeParse({}).success).toBe(false);
  });
});
