import { computeStats } from "@/lib/domain/stats";
import { cn } from "@/lib/cn";
import { formatKg, formatSignedKg, formatSignedPct } from "@/lib/format";
import type { WeightEntry } from "@/lib/types";

type StatsSummaryProps = { entries: WeightEntry[]; today: string };

export function StatsSummary({ entries, today }: StatsSummaryProps) {
  const stats = computeStats(entries, today);
  if (stats.currentKg === null || stats.startKg === null) return null;

  return (
    <section aria-label="Your progress at a glance" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="text-sm text-muted">Current weight</p>
          <p className="font-display text-5xl font-semibold tracking-tight tabular-nums">
            {stats.currentKg.toFixed(1)}
            <span className="ml-1.5 text-xl font-medium text-muted">kg</span>
          </p>
        </div>
        {stats.changeKg !== null && stats.changePct !== null && (
          <p className="pb-1.5 text-sm text-muted">
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {formatSignedKg(stats.changeKg)}
            </span>{" "}
            ({formatSignedPct(stats.changePct)}) since you started
          </p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Starting weight" value={formatKg(stats.startKg)} />
        <Stat label="Logged, last 30 days" value={`${stats.daysLogged30} of 30 days`} />
        <Stat
          label="Current streak"
          value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`}
          className="col-span-2 sm:col-span-1"
        />
      </dl>
    </section>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-brand-soft/60 px-4 py-3", className)}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
