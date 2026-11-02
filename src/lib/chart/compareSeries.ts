import type { LineSeries } from "@/components/charts/LineChart";
import { parseIsoDate } from "@/lib/domain/dates";
import type { CompareSeries } from "@/lib/types";

export const YOU_COLOR = "var(--brand)";

/** Up to five distinct colors for other users (readable on the light surface). */
export const OTHER_COLORS = ["#c2571a", "#6b4fbb", "#b0307a", "#1f6fb2", "#8a6d00"] as const;

/** Stable key for a series; shared by the chart and the legend toggles. */
export const seriesId = (userId: number): string => `user-${userId}`;

/**
 * Maps API series to chart series. Other users' colors are assigned by userId rank within the
 * given series (at most five others), so displayed lines always have distinct colors and
 * neither input order nor legend toggling reshuffles them.
 * Only the viewer's own series is labelled "You"; others use their display name.
 */
export function toLineSeries(series: CompareSeries[]): LineSeries[] {
  const otherIds = [...new Set(series.filter((s) => !s.isYou).map((s) => s.userId))].sort(
    (a, b) => a - b,
  );
  return series.map((s) => ({
    id: seriesId(s.userId),
    label: s.isYou ? "You" : s.displayName,
    color: s.isYou ? YOU_COLOR : OTHER_COLORS[otherIds.indexOf(s.userId) % OTHER_COLORS.length],
    emphasized: s.isYou,
    points: s.points.map((p) => ({ x: parseIsoDate(p.date), y: p.pct })),
  }));
}

export function latestPct(series: CompareSeries): number | null {
  return series.points.at(-1)?.pct ?? null;
}
