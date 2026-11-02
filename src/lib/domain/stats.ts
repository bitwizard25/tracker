import { addDays } from "@/lib/domain/dates";
import type { WeightEntry } from "@/lib/types";

export const STATS_WINDOW_DAYS = 30;

export type WeightStats = {
  currentKg: number | null;
  startKg: number | null;
  changeKg: number | null;
  changePct: number | null;
  daysLogged30: number;
  streak: number;
};

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

function currentStreak(dates: Set<string>, today: string): number {
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeStats(
  entries: Pick<WeightEntry, "entryDate" | "weightKg">[],
  today: string,
): WeightStats {
  const sorted = [...entries]
    .filter((entry) => entry.entryDate <= today)
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const dates = new Set(sorted.map((entry) => entry.entryDate));
  const windowStart = addDays(today, -(STATS_WINDOW_DAYS - 1));

  return {
    currentKg: last?.weightKg ?? null,
    startKg: first?.weightKg ?? null,
    changeKg: first && last ? round(last.weightKg - first.weightKg, 2) : null,
    changePct: first && last ? round(((last.weightKg - first.weightKg) / first.weightKg) * 100, 2) : null,
    daysLogged30: [...dates].filter((date) => date >= windowStart).length,
    streak: currentStreak(dates, today),
  };
}
