"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { formatLongDate } from "@/lib/format";
import { createWeightSchema, updateWeightSchema } from "@/lib/validation/weight";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { WeightEntry } from "@/lib/types";

type DayEditorProps = {
  date: string;
  entry: WeightEntry | null;
  busy: boolean;
  error: string | null;
  onSave: (weightKg: number) => void;
  onDelete: () => void;
  onCancel: () => void;
};

const INVALID = "Enter a weight between 20 and 500 kg.";

/** Moves focus into a freshly shown control; stable callbacks so they only run on mount. */
function focusInput(node: HTMLElement | null) {
  const input = node?.querySelector<HTMLInputElement>("input");
  input?.focus();
  input?.select();
}

function focusKeep(node: HTMLElement | null) {
  node?.querySelector<HTMLElement>("button[data-keep]")?.focus();
}

export function DayEditor({ date, entry, busy, error, onSave, onDelete, onCancel }: DayEditorProps) {
  const [value, setValue] = useState(entry ? String(entry.weightKg) : "");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [confirming, setConfirming] = useState(false);
  const title = formatLongDate(date);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const weightKg = value.trim() === "" ? Number.NaN : Number(value);
    const parsed = entry
      ? updateWeightSchema.safeParse({ weightKg })
      : createWeightSchema.safeParse({ entryDate: date, weightKg });
    if (!parsed.success) {
      setFieldError(INVALID);
      return;
    }
    setFieldError(undefined);
    onSave(parsed.data.weightKg);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    if (confirming) setConfirming(false);
    else if (!busy) onCancel();
  }

  return (
    <div
      role="group"
      aria-label={`${entry ? "Edit" : "Add"} weight for ${title}`}
      onKeyDown={onKeyDown}
      className="rounded-xl border border-line bg-background p-4"
    >
      <h4 className="font-display text-base font-semibold">{title}</h4>
      <p className="text-sm text-muted">{entry ? "Update this day's weight." : "No weight logged for this day yet."}</p>
      {error && <Alert className="mt-3">{error}</Alert>}
      {confirming ? (
        <div ref={focusKeep} role="group" aria-label="Confirm delete" className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm">Delete this entry?</span>
          <Button variant="secondary" className="text-danger" loading={busy} onClick={onDelete}>
            Delete
          </Button>
          <Button variant="ghost" data-keep disabled={busy} onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      ) : (
        <form ref={focusInput} onSubmit={submit} noValidate className="mt-3 flex flex-col gap-3">
          <Input
            name="weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="500"
            label="Weight (kg)"
            placeholder="e.g. 72.4"
            value={value}
            readOnly={busy}
            onChange={(e) => setValue(e.target.value)}
            error={fieldError}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={busy}>
              Save
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
            {entry && (
              <Button
                variant="ghost"
                className="text-danger sm:ml-auto"
                disabled={busy}
                onClick={() => setConfirming(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
