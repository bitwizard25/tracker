"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { registerSchema } from "@/lib/validation/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { collectFieldErrors, type FieldErrors } from "@/components/features/auth/formErrors";

const MESSAGES: FieldErrors = {
  email: "Enter a valid email address.",
  password: "Use at least 8 characters.",
  displayName: "Use between 2 and 30 characters.",
  goalType: "Choose a goal.",
  goalWeightKg: "Enter a weight between 20 and 500 kg.",
};

const GOALS = [
  { value: "lose", label: "Lose weight" },
  { value: "gain", label: "Gain weight" },
] as const;

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = new FormData(event.currentTarget);
    const goalWeight = String(data.get("goalWeightKg") ?? "").trim();
    const parsed = registerSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
      displayName: data.get("displayName"),
      goalType: data.get("goalType"),
      goalWeightKg: goalWeight === "" ? undefined : Number(goalWeight),
    });
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error, MESSAGES));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await api.auth.register(parsed.data);
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setFormError(
        e instanceof ApiError ? e.message : "Could not create your account. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && <Alert>{formError}</Alert>}
      <Input
        name="displayName"
        label="Display name"
        autoComplete="nickname"
        hint="This is the only name other people can see."
        error={errors.displayName}
      />
      <Input name="email" type="email" label="Email" autoComplete="email" error={errors.email} />
      <Input
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        hint="At least 8 characters."
        error={errors.password}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">My goal</legend>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map(({ value, label }) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:outline-2 has-focus-visible:outline-brand"
            >
              <input
                type="radio"
                name="goalType"
                value={value}
                defaultChecked={value === "lose"}
                className="accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
        {errors.goalType && <p className="text-sm text-danger">{errors.goalType}</p>}
      </fieldset>
      <Input
        name="goalWeightKg"
        type="number"
        inputMode="decimal"
        step="0.1"
        label="Goal weight in kg (optional)"
        error={errors.goalWeightKg}
      />
      <Button type="submit" loading={submitting} className="mt-2">
        Create account
      </Button>
    </form>
  );
}
