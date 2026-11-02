"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";

export function SharingToggle() {
  const { user, isLoading, refresh } = useCurrentUser();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <Spinner label="Loading settings" />;
  if (!user) return <Alert>We could not load your settings. Please refresh the page.</Alert>;

  const enabled = user.shareProgress;

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      await api.sharing.set(!enabled);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update your sharing choice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="sharing-label" className="font-medium">
            Share my progress
          </p>
          <p id="sharing-help" className="mt-1 text-sm text-muted">
            Share my name and progress on the leaderboard and comparison graph. Others see your
            display name and % change only, never your weights.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="sharing-label"
          aria-describedby="sharing-help"
          disabled={saving}
          onClick={toggle}
          className={cn(
            "relative mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
            enabled ? "bg-brand" : "bg-line",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform",
              enabled && "translate-x-6",
            )}
          />
        </button>
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
