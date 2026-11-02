export const PROGRESS_CAP_PCT = 10;
export const WINDOW_DAYS = 30;
export const WEIGHTS = { progress: 0.7, consistency: 0.3 } as const;

const MS_PER_DAY = 86_400_000;

const dayNumber = (isoDate: string): number => Date.parse(`${isoDate}T00:00:00Z`) / MS_PER_DAY;

export function progressScore(directionalPct: number): number {
  return Math.min(100, Math.max(0, (directionalPct / PROGRESS_CAP_PCT) * 100));
}

export function consistencyScore(dates: string[], today: string): number {
  const end = dayNumber(today);
  const start = end - (WINDOW_DAYS - 1);
  const inWindow = new Set(
    dates.filter((date) => {
      const day = dayNumber(date);
      return day >= start && day <= end;
    }),
  );
  return Math.min(100, (inWindow.size / WINDOW_DAYS) * 100);
}

export function leaderboardScore(progress: number, consistency: number): number {
  const raw = WEIGHTS.progress * progress + WEIGHTS.consistency * consistency;
  return Math.round(raw * 10) / 10;
}
