export type WeightPoint = { date: string; weightKg: number };
export type PercentPoint = { date: string; pct: number };
export type GoalType = "lose" | "gain";

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function toPercentSeries(entries: WeightPoint[]): PercentPoint[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].weightKg;
  return sorted.map(({ date, weightKg }) => ({
    date,
    pct: round2(((weightKg - first) / first) * 100) + 0, // + 0 normalises -0 to 0
  }));
}

export function directionalChangePct(goalType: GoalType, startKg: number, currentKg: number): number {
  const delta = goalType === "lose" ? startKg - currentKg : currentKg - startKg;
  return (delta / startKg) * 100;
}
