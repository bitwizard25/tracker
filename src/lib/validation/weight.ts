import { z } from "zod";
import { addDays } from "@/lib/date";

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

export const MAX_RANGE_DAYS = 366;

export const weightRangeQuerySchema = z
  .object({ from: entryDateSchema.optional(), to: entryDateSchema.optional() })
  .superRefine(({ from, to }, ctx) => {
    if (!from || !to) return;
    if (from > to) {
      ctx.addIssue({ code: "custom", path: ["from"], message: "from must be on or before to" });
    } else if (to > addDays(from, MAX_RANGE_DAYS)) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `Range cannot exceed ${MAX_RANGE_DAYS} days`,
      });
    }
  });

export type WeightRange = z.infer<typeof weightRangeQuerySchema>;
export type CreateWeightInput = z.infer<typeof createWeightSchema>;
export type UpdateWeightInput = z.infer<typeof updateWeightSchema>;
