"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { WeightChart } from "@/components/charts/WeightChart";
import { StatsSummary } from "@/components/features/weight/StatsSummary";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useWeights } from "@/hooks/useWeights";
import { localToday } from "@/lib/domain/dates";

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const { entries, isLoading, error } = useWeights();
  const [today] = useState(() => localToday());

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">
          {user ? `Hello, ${user.displayName}` : "Dashboard"}
        </h1>
        <p className="mt-1 text-sm text-muted">Your progress, one day at a time.</p>
      </header>

      <section aria-labelledby="individual-heading" className="flex flex-col gap-4">
        <h2 id="individual-heading" className="sr-only">
          Your progress
        </h2>
        {error && <Alert>{error}</Alert>}
        {isLoading ? (
          <DashboardSkeleton />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Card>
              <StatsSummary entries={entries} today={today} />
            </Card>
            <Card>
              <h3 className="mb-3 font-display text-lg font-semibold">Weight over time</h3>
              <WeightChart entries={entries} goalWeightKg={user?.goalWeightKg} />
            </Card>
          </>
        )}
      </section>

      {/* Task 9 renders its CommunityProgress section here, below the individual section. */}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="flex flex-col items-start gap-3 py-8">
      <h3 className="font-display text-lg font-semibold">Your chart starts with one number</h3>
      <p className="max-w-prose text-sm text-muted">
        Log today&apos;s weight and your trend, streak and progress will appear here.
      </p>
      <Link
        href="/log"
        className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Log your first weight
      </Link>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your progress" className="flex flex-col gap-4">
      <div className="h-40 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-80 animate-pulse rounded-2xl bg-line/60" />
    </div>
  );
}
