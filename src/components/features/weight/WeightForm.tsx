"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api-client";
import { localToday } from "@/lib/domain/dates";
import { formatKg, formatLongDate } from "@/lib/format";
import { createWeightSchema } from "@/lib/validation/weight";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { collectFieldErrors, type FieldErrors } from "@/components/features/auth/formErrors";

const MESSAGES: FieldErrors = {
  entryDate: "Choose a valid date.",
  weightKg: "Enter a weight between 20 and 500 kg.",
};

type WeightFormProps = { onSaved: () => void };

export function WeightForm({ onSaved }: WeightFormProps) {
  const [today] = useState(() => localToday());
  const [entryDate, setEntryDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);
    const parsed = createWeightSchema.safeParse({
      entryDate,
      weightKg: weight.trim() === "" ? Number.NaN : Number(weight),
    });
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error, MESSAGES));
      return;
    }
    if (parsed.data.entryDate > today) {
      setErrors({ entryDate: "Pick today or an earlier date." });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { entry, created } = await api.weights.save(parsed.data);
      const verb = created ? "Saved" : "Updated";
      setNotice(`${verb}: ${formatKg(entry.weightKg)} on ${formatLongDate(entry.entryDate)}.`);
      setWeight("");
      onSaved();
    } catch (e) {
      setFormError(
        e instanceof ApiError ? e.message : "Could not save your weight. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && <Alert>{formError}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="entryDate"
          type="date"
          label="Date"
          value={entryDate}
          max={today}
          suppressHydrationWarning
          onChange={(e) => setEntryDate(e.target.value)}
          error={errors.entryDate}
          hint="Logging a date again updates that day."
        />
        <Input
          name="weightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="20"
          max="500"
          label="Weight (kg)"
          placeholder="e.g. 72.4"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          error={errors.weightKg}
        />
      </div>
      <Button type="submit" loading={submitting} className="sm:self-start">
        Save weight
      </Button>
    </form>
  );
}
