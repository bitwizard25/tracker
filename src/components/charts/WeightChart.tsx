"use client";

import { useMemo } from "react";
import { LineChart, type LineSeries } from "@/components/charts/LineChart";
import { parseIsoDate } from "@/lib/domain/dates";
import { formatAxisKg } from "@/lib/format";
import type { WeightEntry } from "@/lib/types";

type WeightChartProps = {
  entries: WeightEntry[];
  goalWeightKg?: number | null;
};

export function WeightChart({ entries, goalWeightKg }: WeightChartProps) {
  const series = useMemo<LineSeries[]>(() => {
    const points = entries.map((e) => ({ x: parseIsoDate(e.entryDate), y: e.weightKg }));
    const mine: LineSeries = {
      id: "weight",
      label: "Weight",
      color: "var(--brand)",
      points,
      emphasized: true,
    };
    if (goalWeightKg == null || points.length === 0) return [mine];
    const goal: LineSeries = {
      id: "goal",
      label: "Goal",
      color: "var(--muted)",
      dashed: true,
      points: [
        { x: points[0].x, y: goalWeightKg },
        { x: points[points.length - 1].x, y: goalWeightKg },
      ],
    };
    return [mine, goal];
  }, [entries, goalWeightKg]);

  return <LineChart series={series} yLabel="Weight" formatY={formatAxisKg} />;
}
