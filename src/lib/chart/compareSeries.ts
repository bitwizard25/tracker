import type { LineSeries } from "@/components/charts/LineChart";
import { parseIsoDate } from "@/lib/domain/dates";
import type { CompareSeries } from "@/lib/types";

export const YOU_COLOR = "var(--brand)";

/** Up to five distinct colors for other users (readable on the light surface). */
export const OTHER_COLORS = ["#c2571a", "#6b4fbb", "#b0307a", "#1f6fb2", "#8a6d00"] as const;

/** Stable key for a series; shared by the chart and the legend toggles. */
export const seriesId = (userId: number): string => `user-${userId}`;

function colorFor(userId: number, universe: number[]): string {
  const rank = [...new Set(universe)].sort((a, b) => a - b).indexOf(userId);
  return OTHER_COLORS[Math.max(rank, 0) % OTHER_COLORS.length];
}

/**
 * Maps API series to chart series. Colors are assigned by userId rank within `universe`
 * (default: the given series), so order and toggling never reshuffle them.
 * Only the viewer's own series is labelled "You"; others use their display name.
 */
export function toLineSeries(
  series: CompareSeries[],
  universe: number[] = series.filter((s) => !s.isYou).map((s) => s.userId),
): LineSeries[] {
  return series.map((s) => ({
    id: seriesId(s.userId),
    label: s.isYou ? "You" : s.displayName,
    color: s.isYou ? YOU_COLOR : colorFor(s.userId, universe),
    emphasized: s.isYou,
    points: s.points.map((p) => ({ x: parseIsoDate(p.date), y: p.pct })),
  }));
}

export function latestPct(series: CompareSeries): number | null {
  return series.points.at(-1)?.pct ?? null;
}
