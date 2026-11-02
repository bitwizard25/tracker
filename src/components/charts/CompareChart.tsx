"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { latestPct, seriesId, toLineSeries } from "@/lib/chart/compareSeries";
import { formatSignedPct } from "@/lib/format";
import type { CompareSeries } from "@/lib/types";

type CompareChartProps = {
  series: CompareSeries[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function CompareChart({
  series,
  isLoading,
  error,
  onRetry,
}: CompareChartProps) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const lines = useMemo(() => toLineSeries(series), [series]);
  const visible = useMemo(() => lines.filter((l) => !hidden.has(l.id)), [lines, hidden]);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading comparison">
        <div className="h-72 animate-pulse rounded-2xl bg-line/60 motion-reduce:animate-none" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert className="w-full">{error}</Alert>
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <p className="py-3 text-sm text-muted">
        Nothing to compare yet. Log a weight, and ask friends to share their progress too.
      </p>
    );
  }

  function toggle(id: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {series.every((s) => s.isYou) && (
        <Alert tone="info">
          Nobody else is sharing yet, so only your line is shown. Share your progress and invite
          others to join the comparison.
        </Alert>
      )}
      <ul
        className="flex flex-wrap gap-2"
        aria-label="Chart legend. Toggle a line to show or hide it."
      >
        {series.map((s) => {
          const id = seriesId(s.userId);
          const line = lines.find((l) => l.id === id);
          if (!line) return null;
          const shown = !hidden.has(id);
          const latest = latestPct(s);
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={shown}
                onClick={() => toggle(id)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  shown ? "bg-surface" : "bg-transparent text-muted line-through",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("w-5 rounded-full", s.isYou ? "h-1" : "h-0.5")}
                  style={{ background: line.color }}
                />
                <span className={cn(s.isYou && "font-semibold")}>{line.label}</span>
                {latest !== null && (
                  <span className="text-muted tabular-nums">{formatSignedPct(latest)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <LineChart series={visible} yLabel="Change since first entry" formatY={formatSignedPct} />
    </div>
  );
}
