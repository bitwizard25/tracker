import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const entryDateSchema = z
  .string()
  .regex(DATE_PATTERN)
  .refine(isRealCalendarDate, { message: "Not a real calendar date" });

export const weightKgSchema = z
  .number()
  .min(20)
  .max(500)
  .transform((kg) => Math.round(kg * 100) / 100);

export const createWeightSchema = z.object({
  entryDate: entryDateSchema,
  weightKg: weightKgSchema,
});

export const updateWeightSchema = z.object({ weightKg: weightKgSchema });

export type CreateWeightInput = z.infer<typeof createWeightSchema>;
export type UpdateWeightInput = z.infer<typeof updateWeightSchema>;
