type ConsentState = {
  shareProgress: boolean;
  dismissed: boolean;
  /** The viewer asked to see the consent card again after dismissing it. */
  reopened?: boolean;
};

/** The consent card shows until the viewer opts in, unless dismissed this session and not re-opened. */
export function shouldShowConsentPrompt({
  shareProgress,
  dismissed,
  reopened = false,
}: ConsentState): boolean {
  return !shareProgress && (!dismissed || reopened);
}

/** "Not now" is remembered per user, so a different account on the same tab sees the card. */
export const consentDismissKey = (userId: number): string => `consent-prompt-dismissed:${userId}`;
