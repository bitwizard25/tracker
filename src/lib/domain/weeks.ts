import { utcFormat } from "d3-time-format";
import { addDays, parseIsoDate } from "@/lib/domain/dates";
import type { WeightEntry } from "@/lib/types";

/** Weeks run Monday..Sunday (ISO) and are computed from YYYY-MM-DD strings; no clock reads. */

export type WeekDay = { date: string; entry: WeightEntry | null; isFuture: boolean };

export type WeekSummary = {
  days: WeekDay[];
  loggedCount: number;
  average: number | null;
  min: number | null;
  max: number | null;
  changeFirstToLast: number | null;
};

export function weekStart(date: string): string {
  const dow = parseIsoDate(date).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekEnd(start: string): string {
  return addDays(start, 6);
}

export function addWeeks(start: string, weeks: number): string {
  return addDays(start, weeks * 7);
}

export function isCurrentWeek(start: string, today: string): boolean {
  return weekStart(today) === start;
}

const short = utcFormat("%b %-d");
const withYear = utcFormat("%b %-d, %Y");

/** "Oct 27 – Nov 2"; years are shown when the week crosses a year or is not in `currentYear`. */
export function formatWeekRange(start: string, currentYear?: number): string {
  const s = parseIsoDate(start);
  const e = parseIsoDate(weekEnd(start));
  const crosses = s.getUTCFullYear() !== e.getUTCFullYear();
  if (crosses) return `${withYear(s)} – ${withYear(e)}`;
  if (currentYear !== undefined && s.getUTCFullYear() !== currentYear) {
    return `${short(s)} – ${withYear(e)}`;
  }
  return `${short(s)} – ${short(e)}`;
}

export function weekSummary(
  entries: Pick<WeightEntry, "id" | "entryDate" | "weightKg">[],
  start: string,
  today: string,
): WeekSummary {
  const byDate = new Map(entries.map((entry) => [entry.entryDate, entry]));
  const days: WeekDay[] = weekDays(start).map((date) => {
    const isFuture = date > today;
    return { date, isFuture, entry: isFuture ? null : (byDate.get(date) ?? null) };
  });
  const logged = days.flatMap((d) => (d.entry ? [d.entry] : []));
  if (logged.length === 0) {
    return { days, loggedCount: 0, average: null, min: null, max: null, changeFirstToLast: null };
  }
  const values = logged.map((l) => l.weightKg);
  return {
    days,
    loggedCount: logged.length,
    average: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    changeFirstToLast:
      logged.length > 1 ? logged[logged.length - 1].weightKg - logged[0].weightKg : null,
  };
}
