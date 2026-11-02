import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

const valid = {
  email: "a@b.co",
  password: "password1",
  displayName: "  Raj ",
  goalType: "lose",
  goalWeightKg: 70,
};

describe("registerSchema", () => {
  it("accepts valid input and trims displayName", () => {
    const r = registerSchema.parse(valid);
    expect(r.displayName).toBe("Raj");
  });
  it("allows omitting goalWeightKg", () => {
    const { goalWeightKg: _omit, ...rest } = valid;
    expect(registerSchema.safeParse(rest).success).toBe(true);
  });
  it.each([
    ["short password", { password: "short12" }],
    ["bad email", { email: "nope" }],
    ["displayName too short", { displayName: " a " }],
    ["displayName too long", { displayName: "x".repeat(31) }],
    ["bad goalType", { goalType: "maintain" }],
    ["goal weight too low", { goalWeightKg: 10 }],
  ])("rejects %s", (_n, patch) => {
    expect(registerSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
  it("rejects missing password or bad email", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "x", password: "x" }).success).toBe(false);
  });
});
