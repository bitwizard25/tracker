/** Padded, non-zero y domain for a week of bars so small differences stay visible. */
export function weekDomain(values: number[]): [number, number] | null {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const lo = min - Math.max(span * 0.8, 1.5);
  const hi = max + Math.max(span * 0.25, 0.75);
  return [Math.max(lo, 0), hi];
}
