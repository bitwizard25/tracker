"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import type { LeaderboardEntry } from "@/lib/types";

type LeaderboardState = {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type Loaded = { entries: LeaderboardEntry[]; error: string | null };

async function fetchBoard(): Promise<Loaded> {
  try {
    return { entries: (await api.leaderboard.get()).entries, error: null };
  } catch (e) {
    return {
      entries: [],
      error: e instanceof ApiError ? e.message : "Could not load the leaderboard.",
    };
  }
}

/** Leaderboard of users who opted in, best score first. */
export function useLeaderboard(): LeaderboardState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const reload = useCallback(async () => setLoaded(await fetchBoard()), []);

  useEffect(() => {
    let cancelled = false;
    void fetchBoard().then((result) => {
      if (!cancelled) setLoaded(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    entries: loaded?.entries ?? [],
    isLoading: loaded === null,
    error: loaded?.error ?? null,
    reload,
  };
}
