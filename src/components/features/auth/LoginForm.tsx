"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { loginSchema } from "@/lib/validation/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { collectFieldErrors, type FieldErrors } from "@/components/features/auth/formErrors";

const MESSAGES: FieldErrors = {
  email: "Enter a valid email address.",
  password: "Enter your password.",
};

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const data = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: data.get("email"),
      password: data.get("password"),
    });
    if (!parsed.success) {
      setErrors(collectFieldErrors(parsed.error, MESSAGES));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await api.auth.login(parsed.data);
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Could not sign in. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && <Alert>{formError}</Alert>}
      <Input name="email" type="email" label="Email" autoComplete="email" error={errors.email} />
      <Input
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        error={errors.password}
      />
      <Button type="submit" loading={submitting} className="mt-2">
        Log in
      </Button>
    </form>
  );
}
