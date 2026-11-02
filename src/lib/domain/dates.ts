const DAY_MS = 86_400_000;

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today in the user's local time zone as YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  return toIsoDate(now);
}

/** Parses YYYY-MM-DD as a UTC midnight Date (stable for arithmetic and charting). */
export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function addDays(value: string, days: number): string {
  return new Date(parseIsoDate(value).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}
