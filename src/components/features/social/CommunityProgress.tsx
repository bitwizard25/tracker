"use client";

import { useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { shouldShowConsentPrompt } from "@/lib/domain/consent";
import { useCompare } from "@/hooks/useCompare";
import { useConsentDismissed } from "@/hooks/useConsentDismissed";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { CompareChart } from "@/components/charts/CompareChart";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CompareControls } from "@/components/features/social/CompareControls";
import { ConsentPrompt } from "@/components/features/social/ConsentPrompt";
import { LeaderboardTable } from "@/components/features/social/LeaderboardTable";
import type { PublicUser } from "@/lib/types";

type CommunityProgressProps = {
  user: PublicUser;
  /** Re-fetches the current user after the sharing choice changes. */
  onSharingChanged: () => Promise<void>;
};

export function CommunityProgress({ user, onSharingChanged }: CommunityProgressProps) {
  const [dismissed, dismiss] = useConsentDismissed();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [sharingError, setSharingError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const board = useLeaderboard();
  const candidateIds = useMemo(
    () => board.entries.filter((e) => !e.isYou).map((e) => e.userId),
    [board.entries],
  );
  // Ignore selections for users who stopped sharing since they were picked.
  const activeIds = useMemo(
    () => selectedIds.filter((id) => candidateIds.includes(id)),
    [selectedIds, candidateIds],
  );
  const compare = useCompare(activeIds);

  async function changeSharing(share: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setSharingError(null);
    try {
      await api.sharing.set(share);
      await onSharingChanged();
      await Promise.all([board.reload(), compare.reload()]);
      // the clicked control is about to unmount; keep keyboard focus inside the section
      headingRef.current?.focus();
    } catch (e) {
      setSharingError(e instanceof ApiError ? e.message : "Could not update your sharing choice.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function notNow() {
    dismiss();
    headingRef.current?.focus();
  }

  const showPrompt = shouldShowConsentPrompt({ shareProgress: user.shareProgress, dismissed });

  return (
    <section aria-labelledby="community-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="community-heading"
            ref={headingRef}
            tabIndex={-1}
            className="font-display text-xl font-semibold outline-none"
          >
            Community progress
          </h2>
          <p className="mt-1 text-sm text-muted">
            Members who chose to share appear here by name and % change, never by weight.
          </p>
        </div>
        {user.shareProgress && (
          <Button variant="secondary" loading={busy} onClick={() => changeSharing(false)}>
            Stop sharing
          </Button>
        )}
      </div>

      {showPrompt && (
        <ConsentPrompt
          busy={busy}
          error={sharingError}
          onShare={() => changeSharing(true)}
          onDismiss={notNow}
        />
      )}
      {!showPrompt && !user.shareProgress && (
        <Alert tone="info" className="flex flex-wrap items-center justify-between gap-3">
          <span>You are hidden from others. Only members who opted in are shown.</span>
          <Button variant="secondary" className="min-h-9" loading={busy} onClick={() => changeSharing(true)}>
            Share my progress
          </Button>
        </Alert>
      )}
      {!showPrompt && sharingError && <Alert>{sharingError}</Alert>}

      <Card>
        <h3 className="mb-3 font-display text-lg font-semibold">Leaderboard</h3>
        {board.isLoading ? (
          <div role="status" aria-label="Loading leaderboard" className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-xl bg-line/60 motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : board.error ? (
          <div className="flex flex-col items-start gap-3">
            <Alert className="w-full">{board.error}</Alert>
            <Button variant="secondary" onClick={() => void board.reload()}>
              Try again
            </Button>
          </div>
        ) : (
          <LeaderboardTable entries={board.entries} />
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="font-display text-lg font-semibold">How you compare</h3>
        <CompareControls
          candidates={board.entries}
          selectedIds={activeIds}
          onChange={setSelectedIds}
        />
        <CompareChart
          series={compare.series}
          colorUniverse={candidateIds}
          isLoading={compare.isLoading}
          error={compare.error}
          onRetry={() => void compare.reload()}
        />
      </Card>
    </section>
  );
}
