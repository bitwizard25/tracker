"use client";

import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { WeightForm } from "@/components/features/weight/WeightForm";
import { WeightHistory } from "@/components/features/weight/WeightHistory";
import { useWeights } from "@/hooks/useWeights";

export default function LogPage() {
  const { entries, isLoading, error, reload } = useWeights();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Log weight</h1>
        <p className="mt-1 text-sm text-muted">One entry a day keeps your trend honest.</p>
      </header>
      <Card>
        <WeightForm onSaved={() => void reload()} />
      </Card>
      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-3 font-display text-lg font-semibold">
          Recent entries
        </h2>
        <Card className="py-2 sm:py-3">
          {error && <Alert className="my-3">{error}</Alert>}
          {isLoading ? (
            <div className="py-6">
              <Spinner label="Loading entries" />
            </div>
          ) : (
            <WeightHistory entries={entries} onChanged={reload} />
          )}
        </Card>
      </section>
    </div>
  );
}
