"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { api, ApiError } from "@/lib/api-client";
import { localToday } from "@/lib/domain/dates";
import {
  addWeeks,
  formatWeekRange,
  weekEnd,
  weekStart as weekStartOf,
  weekSummary,
  type WeekDay,
} from "@/lib/domain/weeks";
import { formatKg, formatLongDate, formatSignedKg } from "@/lib/format";
import { WeeklyBarChart } from "@/components/charts/WeeklyBarChart";
import { DayEditor } from "@/components/features/weight/DayEditor";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { WeightEntry } from "@/lib/types";

type WeeklyViewProps = {
  goalWeightKg?: number | null;
  /** Called after any successful save/delete so other dashboard views can refetch. */
  onChanged: () => void | Promise<void>;
};

const noopSubscribe = () => () => {};

/** Local today on the client; null during server render and hydration (so no mismatch). */
function useLocalToday(): string | null {
  return useSyncExternalStore(noopSubscribe, () => localToday(), () => null);
}

const errorMessage = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export function WeeklyView({ goalWeightKg, onChanged }: WeeklyViewProps) {
  const today = useLocalToday();
  if (!today) return <WeeklySkeleton />;
  return <Weekly today={today} goalWeightKg={goalWeightKg} onChanged={onChanged} />;
}

type WeeklyProps = WeeklyViewProps & { today: string };

function Weekly({ today, goalWeightKg, onChanged }: WeeklyProps) {
  const currentWeek = weekStartOf(today);
  const [picked, setPicked] = useState<string | null>(null);
  const ws = picked ?? currentWeek;
  const isCurrent = ws === currentWeek;

  const [cache, setCache] = useState<ReadonlyMap<string, WeightEntry[]>>(() => new Map());
  const [loadError, setLoadError] = useState<{ week: string; message: string } | null>(null);
  const tokens = useRef(new Map<string, number>());
  const prefetched = useRef(new Set<string>());
  const visibleRef = useRef(ws);
  useEffect(() => {
    visibleRef.current = ws;
  }, [ws]);

  const [editing, setEditing] = useState<WeekDay | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const restoreDate = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  /** Starts a fetch of one week; the token makes only the latest request per week win. */
  const fetchWeek = useCallback(async (week: string) => {
    const token = (tokens.current.get(week) ?? 0) + 1;
    tokens.current.set(week, token);
    try {
      const { entries } = await api.weights.list({ from: week, to: weekEnd(week) });
      return { week, token, entries, error: null as string | null };
    } catch (e) {
      return { week, token, entries: null, error: errorMessage(e, "Could not load this week.") };
    }
  }, []);

  const apply = useCallback(
    (result: Awaited<ReturnType<typeof fetchWeek>>, quiet: boolean) => {
      const { week, token, entries, error } = result;
      if (tokens.current.get(week) !== token) return; // superseded by a newer request
      if (entries) {
        setCache((prev) => new Map(prev).set(week, entries));
        setLoadError((prev) => (prev?.week === week ? null : prev));
      } else if (!quiet && week === visibleRef.current) {
        setLoadError({ week, message: error ?? "Could not load this week." });
      }
    },
    [],
  );

  const load = useCallback(
    async (week: string, quiet: boolean) => apply(await fetchWeek(week), quiet),
    [fetchWeek, apply],
  );

  useEffect(() => {
    void fetchWeek(ws).then((result) => apply(result, false));
    const previous = addWeeks(ws, -1);
    if (!prefetched.current.has(previous)) {
      prefetched.current.add(previous);
      void fetchWeek(previous).then((result) => apply(result, true));
    }
  }, [ws, fetchWeek, apply]);

  const entries = cache.get(ws);
  const error = loadError?.week === ws ? loadError.message : null;
  const summary = useMemo(() => weekSummary(entries ?? [], ws, today), [entries, ws, today]);
  const currentYear = Number(today.slice(0, 4));
  const range = formatWeekRange(ws, currentYear);
  const canGoNext = addWeeks(ws, 1) <= currentWeek;

  const defaultFocus = useMemo(() => {
    const past = summary.days.filter((d) => !d.isFuture);
    return past[past.length - 1]?.date ?? ws;
  }, [summary, ws]);
  const tabStopDate =
    focusDate && summary.days.some((d) => d.date === focusDate && !d.isFuture) ? focusDate : defaultFocus;

  // After the editor closes, return focus to the bar that opened it.
  useEffect(() => {
    if (editing !== null || restoreDate.current === null) return;
    const date = restoreDate.current;
    restoreDate.current = null;
    containerRef.current?.querySelector<HTMLElement>(`[data-day="${date}"]`)?.focus();
  }, [editing]);

  // Bring the editor into view when it opens (focus is moved into its input by DayEditor).
  useEffect(() => {
    if (editing) editorRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [editing]);

  function goTo(week: string) {
    if (week > currentWeek || week === ws) return;
    setEditing(null);
    setEditError(null);
    setNotice(null);
    restoreDate.current = null;
    setPicked(week);
  }

  function closeEditor() {
    if (editing) restoreDate.current = editing.date;
    setEditing(null);
    setEditError(null);
  }

  function open(day: WeekDay) {
    if (day.isFuture || day.date > today) return;
    setEditError(null);
    setNotice(null);
    setEditing(day);
  }

  async function run(action: () => Promise<string>, failure: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setEditError(null);
    try {
      const message = await action();
      await load(ws, true);
      await onChanged();
      setNotice(message);
      closeEditor();
    } catch (e) {
      setEditError(errorMessage(e, failure));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function save(day: WeekDay, weightKg: number) {
    void run(async () => {
      if (day.entry) await api.weights.update(day.entry.id, weightKg);
      else await api.weights.save({ entryDate: day.date, weightKg });
      return `Saved ${formatKg(weightKg)} for ${formatLongDate(day.date)}.`;
    }, "Could not save your weight. Please try again.");
  }

  function remove(day: WeekDay) {
    const entry = day.entry;
    if (!entry) return;
    void run(async () => {
      await api.weights.remove(entry.id);
      return `Deleted the entry for ${formatLongDate(day.date)}.`;
    }, "Could not delete this entry.");
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "PageUp") {
      event.preventDefault();
      goTo(addWeeks(ws, -1));
      return;
    }
    if (event.key === "PageDown") {
      event.preventDefault();
      goTo(addWeeks(ws, 1));
      return;
    }
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const buttons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>("button[data-day]") ?? [],
    );
    if (buttons.length === 0) return;
    const current = buttons.findIndex((b) => b === document.activeElement);
    let next = current;
    if (event.key === "ArrowRight") next = Math.min(current + 1, buttons.length - 1);
    else if (event.key === "ArrowLeft") next = Math.max(current - 1, 0);
    else if (event.key === "Home") next = 0;
    else next = buttons.length - 1;
    event.preventDefault();
    buttons[Math.max(next, 0)]?.focus();
  }

  const chartLabel = `Weekly weight, ${range}. Use left and right arrow keys to move between days, Page Up and Page Down to change week.`;
  const announcement = notice ?? `Showing ${range}${isCurrent ? ", this week" : ""}.`;

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" className="px-3" onClick={() => goTo(addWeeks(ws, -1))}>
          <span aria-hidden="true">‹</span> Previous<span className="sr-only"> week</span>
          <span aria-hidden="true" className="hidden sm:inline">
            {" "}
            week
          </span>
        </Button>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="font-semibold tabular-nums">{range}</p>
          {isCurrent ? (
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
              This week
            </span>
          ) : (
            <Button variant="ghost" className="min-h-11 px-3" onClick={() => goTo(currentWeek)}>
              Jump to this week
            </Button>
          )}
        </div>
        <Button
          variant="secondary"
          className="px-3"
          disabled={!canGoNext}
          onClick={() => goTo(addWeeks(ws, 1))}
        >
          Next<span className="sr-only"> week</span>
          <span aria-hidden="true" className="hidden sm:inline">
            {" "}
            week
          </span>{" "}
          <span aria-hidden="true">›</span>
        </Button>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {error ? (
        <Alert className="flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <Button
            variant="secondary"
            onClick={() => {
              setLoadError(null);
              void load(ws, false);
            }}
          >
            Try again
          </Button>
        </Alert>
      ) : entries === undefined ? (
        <WeeklySkeleton chartOnly />
      ) : (
        <div className="relative">
          <WeeklyBarChart
            days={summary.days}
            today={today}
            goalWeightKg={goalWeightKg}
            editingDate={editing?.date ?? null}
            tabStopDate={tabStopDate}
            onSelect={open}
            onFocusDate={setFocusDate}
            onKeyDown={onKeyDown}
            label={chartLabel}
          />
          {summary.loggedCount === 0 && (
            <p className="pointer-events-none absolute inset-x-0 top-12 mx-auto max-w-64 text-center text-sm text-muted">
              Nothing logged this week. Tap a day to add your weight.
            </p>
          )}
        </div>
      )}

      {!error && entries !== undefined && (
        <p className="text-xs text-muted">
          The axis does not start at zero, so small differences are easier to see.
          {goalWeightKg != null && summary.loggedCount > 0 && " Dashed line shows your goal when it is in range."}
        </p>
      )}

      {editing && (
        <div ref={editorRef}>
          <DayEditor
            key={editing.date}
            date={editing.date}
            entry={editing.entry}
            busy={busy}
            error={editError}
            onSave={(kg) => save(editing, kg)}
            onDelete={() => remove(editing)}
            onCancel={closeEditor}
          />
        </div>
      )}

      {entries !== undefined && !error && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Days logged" value={`${summary.loggedCount}/7`} />
          <Stat label="Average" value={summary.average === null ? "—" : formatKg(summary.average)} />
          <Stat label="Lowest" value={summary.min === null ? "—" : formatKg(summary.min)} />
          <Stat label="Highest" value={summary.max === null ? "—" : formatKg(summary.max)} />
          <Stat
            label="Change"
            value={summary.changeFirstToLast === null ? "—" : formatSignedKg(summary.changeFirstToLast)}
            hint={summary.changeFirstToLast === null ? undefined : "first to last logged"}
          />
        </dl>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-background px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

const SKELETON_HEIGHTS = [55, 70, 45, 80, 60, 35, 50];

function WeeklySkeleton({ chartOnly = false }: { chartOnly?: boolean }) {
  return (
    <div role="status" aria-label="Loading weekly view" className="flex flex-col gap-4">
      {!chartOnly && <div className="h-11 animate-pulse rounded-xl bg-line/60 motion-reduce:animate-none" />}
      <div className="flex h-[260px] items-end gap-2 px-2">
        {SKELETON_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-lg bg-line/60 motion-reduce:animate-none"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
