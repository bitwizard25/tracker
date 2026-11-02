"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { WeightEntry } from "@/lib/types";

type WeightsState = {
  entries: WeightEntry[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type Loaded = { entries: WeightEntry[]; error: string | null };

async function fetchEntries(): Promise<Loaded> {
  try {
    return { entries: (await api.weights.list()).entries, error: null };
  } catch (e) {
    return {
      entries: [],
      error: e instanceof ApiError ? e.message : "Could not load your weights.",
    };
  }
}

/** Own weight entries, date ascending. */
export function useWeights(): WeightsState {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((loaded: Loaded) => {
    setEntries(loaded.entries);
    setError(loaded.error);
    setIsLoading(false);
  }, []);

  const reload = useCallback(async () => apply(await fetchEntries()), [apply]);

  useEffect(() => {
    let cancelled = false;
    void fetchEntries().then((loaded) => {
      if (!cancelled) apply(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  return { entries, isLoading, error, reload };
}
