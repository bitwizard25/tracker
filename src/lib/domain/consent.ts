type ConsentState = { shareProgress: boolean; dismissed: boolean };

/** The consent card shows until the viewer opts in or dismisses it for this session. */
export function shouldShowConsentPrompt({ shareProgress, dismissed }: ConsentState): boolean {
  return !shareProgress && !dismissed;
}
