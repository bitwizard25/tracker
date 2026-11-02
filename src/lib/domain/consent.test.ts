import { describe, expect, it } from "vitest";
import { shouldShowConsentPrompt } from "@/lib/domain/consent";

describe("shouldShowConsentPrompt", () => {
  it("shows for a viewer who is not sharing and has not dismissed", () => {
    expect(shouldShowConsentPrompt({ shareProgress: false, dismissed: false })).toBe(true);
  });

  it("hides once dismissed for this session", () => {
    expect(shouldShowConsentPrompt({ shareProgress: false, dismissed: true })).toBe(false);
  });

  it("never shows for a viewer who already shares", () => {
    expect(shouldShowConsentPrompt({ shareProgress: true, dismissed: false })).toBe(false);
    expect(shouldShowConsentPrompt({ shareProgress: true, dismissed: true })).toBe(false);
  });
});
