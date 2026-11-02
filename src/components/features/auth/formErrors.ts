import type { ZodError } from "zod";

export type FieldErrors = Partial<Record<string, string>>;

export function collectFieldErrors(error: ZodError, messages: FieldErrors): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    errors[field] ??= messages[field] ?? issue.message;
  }
  return errors;
}
