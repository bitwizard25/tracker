"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api-client";
import { formatKg, formatLongDate, formatSignedKg } from "@/lib/format";
import { updateWeightSchema } from "@/lib/validation/weight";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { WeightEntry } from "@/lib/types";

const PAGE_SIZE = 10;

type WeightHistoryProps = { entries: WeightEntry[]; onChanged: () => void | Promise<void> };
type Mode = { kind: "edit" | "delete"; id: number } | null;

export function WeightHistory({ entries, onChanged }: WeightHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const [mode, setMode] = useState<Mode>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const restoreKey = useRef<string | null>(null);

  // After an edit/delete closes, put focus back on the row trigger, or on the list when the row is gone.
  useEffect(() => {
    if (mode !== null || restoreKey.current === null) return;
    const container = containerRef.current;
    const key = restoreKey.current;
    restoreKey.current = null;
    const target = container?.querySelector<HTMLElement>(`[data-focus-key="${key}"]`) ?? container;
    target?.focus();
  }, [mode]);

  if (entries.length === 0) {
    return <p className="py-3 text-sm text-muted">Nothing logged yet. Your entries will appear here.</p>;
  }

  const newestFirst = entries.map((entry, index) => ({ entry, previous: entries[index - 1] })).reverse();
  const visible = showAll ? newestFirst : newestFirst.slice(0, PAGE_SIZE);

  function close(entry: WeightEntry, kind: "edit" | "delete") {
    restoreKey.current = `${kind}-${entry.id}`;
    setMode(null);
  }

  async function run(
    entry: WeightEntry,
    kind: "edit" | "delete",
    action: () => Promise<unknown>,
    failure: string,
  ) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
      close(entry, kind);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : failure);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div ref={containerRef} tabIndex={-1} className="flex flex-col gap-3 outline-none">
      {error && <Alert className="mt-3">{error}</Alert>}
      <ul className="divide-y divide-line">
        {visible.map(({ entry, previous }) => {
          const delta = previous ? entry.weightKg - previous.weightKg : null;
          const editing = mode?.kind === "edit" && mode.id === entry.id;
          const deleting = mode?.kind === "delete" && mode.id === entry.id;
          return (
            <li key={entry.id} className="py-3">
              {editing ? (
                <EditRow
                  entry={entry}
                  busy={busy}
                  onCancel={() => close(entry, "edit")}
                  onSave={(kg) =>
                    run(
                      entry,
                      "edit",
                      () => api.weights.update(entry.id, kg),
                      "Could not update this entry.",
                    )
                  }
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div>
                    <p className="text-sm text-muted">{formatLongDate(entry.entryDate)}</p>
                    <p className="font-semibold tabular-nums">
                      {formatKg(entry.weightKg)}
                      {delta !== null && Math.abs(delta) >= 0.05 && (
                        <span className="ml-2 text-sm font-normal text-muted">
                          {formatSignedKg(delta)}
                        </span>
                      )}
                    </p>
                  </div>
                  {deleting ? (
                    <div
                      ref={focusKeepOnMount}
                      className="flex items-center gap-2"
                      role="group"
                      aria-label="Confirm delete"
                    >
                      <span className="text-sm">Delete this entry?</span>
                      <Button
                        variant="secondary"
                        className="min-h-9 px-3 text-danger"
                        loading={busy}
                        onClick={() =>
                          run(
                            entry,
                            "delete",
                            () => api.weights.remove(entry.id),
                            "Could not delete this entry.",
                          )
                        }
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-9 px-3"
                        data-keep
                        disabled={busy}
                        onClick={() => close(entry, "delete")}
                      >
                        Keep
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="min-h-9 px-3"
                        data-focus-key={`edit-${entry.id}`}
                        aria-label={`Edit entry for ${entry.entryDate}`}
                        onClick={() => setMode({ kind: "edit", id: entry.id })}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-9 px-3"
                        data-focus-key={`delete-${entry.id}`}
                        aria-label={`Delete entry for ${entry.entryDate}`}
                        onClick={() => setMode({ kind: "delete", id: entry.id })}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {entries.length > PAGE_SIZE && (
        <Button variant="ghost" className="mb-2 self-start" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show fewer" : `Show all ${entries.length} entries`}
        </Button>
      )}
    </div>
  );
}

/** Stable ref callbacks (so they run only on mount) that move focus into a freshly shown control. */
function focusKeepOnMount(node: HTMLElement | null) {
  node?.querySelector<HTMLElement>("button[data-keep]")?.focus();
}

function focusInputOnMount(node: HTMLElement | null) {
  node?.querySelector<HTMLElement>("input")?.focus();
}

type EditRowProps = {
  entry: WeightEntry;
  busy: boolean;
  onSave: (kg: number) => void;
  onCancel: () => void;
};

function EditRow({ entry, busy, onSave, onCancel }: EditRowProps) {
  const [value, setValue] = useState(String(entry.weightKg));
  const [error, setError] = useState<string | undefined>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateWeightSchema.safeParse({
      weightKg: value.trim() === "" ? Number.NaN : Number(value),
    });
    if (!parsed.success) {
      setError("Enter a weight between 20 and 500 kg.");
      return;
    }
    onSave(parsed.data.weightKg);
  }

  return (
    <form
      ref={focusInputOnMount}
      onSubmit={submit}
      noValidate
      className="flex flex-wrap items-end gap-3"
    >
      <Input
        type="number"
        inputMode="decimal"
        step="0.1"
        label={`Weight for ${formatLongDate(entry.entryDate)} (kg)`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error}
        className="w-40"
      />
      <Button type="submit" loading={busy}>
        Save
      </Button>
      <Button variant="ghost" disabled={busy} onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
