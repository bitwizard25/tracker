"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { CompareSeries } from "@/lib/types";

type CompareState = {
  series: CompareSeries[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type Loaded = { key: string; series: CompareSeries[]; error: string | null };

async function fetchCompare(userIds: number[], key: string): Promise<Loaded> {
  try {
    return { key, series: (await api.compare.get(userIds)).series, error: null };
  } catch (e) {
    return {
      key,
      series: [],
      error: e instanceof ApiError ? e.message : "Could not load the comparison.",
    };
  }
}

/**
 * Percent-change series for the viewer plus the chosen sharing users.
 * An empty `userIds` keeps the server default (top 4 on the leaderboard).
 */
export function useCompare(userIds: number[]): CompareState {
  const key = userIds.join(",");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const reload = useCallback(
    async () => setLoaded(await fetchCompare(key === "" ? [] : key.split(",").map(Number), key)),
    [key],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchCompare(key === "" ? [] : key.split(",").map(Number), key).then((result) => {
      if (!cancelled) setLoaded(result);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // A result for a previous selection counts as loading, so the chart never shows stale lines.
  const current = loaded?.key === key ? loaded : null;
  return {
    series: current?.series ?? [],
    isLoading: current === null,
    error: current?.error ?? null,
    reload,
  };
}
