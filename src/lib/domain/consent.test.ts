import { describe, expect, it } from "vitest";
import { consentDismissKey, shouldShowConsentPrompt } from "@/lib/domain/consent";

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

describe("shouldShowConsentPrompt when re-opened", () => {
  it("shows again after being dismissed", () => {
    expect(shouldShowConsentPrompt({ shareProgress: false, dismissed: true, reopened: true })).toBe(
      true,
    );
  });

  it("stays hidden once the viewer shares, even if re-opened", () => {
    expect(shouldShowConsentPrompt({ shareProgress: true, dismissed: true, reopened: true })).toBe(
      false,
    );
  });
});

describe("consentDismissKey", () => {
  it("differs per user so one account's Not now never hides another's card", () => {
    expect(consentDismissKey(1)).not.toBe(consentDismissKey(2));
    expect(consentDismissKey(7)).toBe("consent-prompt-dismissed:7");
  });
});
