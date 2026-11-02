const MS_PER_DAY = 86_400_000;

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, n: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`) + n * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}
