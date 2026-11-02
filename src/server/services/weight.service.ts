import { addDays } from "@/lib/date";
import { createWeightSchema, weightKgSchema } from "@/lib/validation/weight";
import type { Db } from "@/server/db/client";
import { NotFoundError, ValidationError } from "@/server/errors";
import {
  deleteEntry,
  listByUser,
  updateWeight,
  upsertEntry,
  type WeightEntry,
} from "@/server/repositories/weight.repository";

// Users ahead of UTC (e.g. India, UTC+5:30) may log their local "today", which is up to a day ahead.
const FUTURE_TOLERANCE_DAYS = 1;

export function list(db: Db, userId: number): WeightEntry[] {
  return listByUser(db, userId);
}

export function logWeight(
  db: Db,
  userId: number,
  input: { entryDate: string; weightKg: number },
  today: string,
): { entry: WeightEntry; created: boolean } {
  const parsed = createWeightSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid weight entry", parsed.error.issues);
  }
  if (parsed.data.entryDate > addDays(today, FUTURE_TOLERANCE_DAYS)) {
    throw new ValidationError("entryDate cannot be in the future");
  }
  return upsertEntry(db, userId, parsed.data.entryDate, parsed.data.weightKg);
}

export function update(db: Db, userId: number, id: number, weightKg: number): WeightEntry {
  const parsed = weightKgSchema.safeParse(weightKg);
  if (!parsed.success) {
    throw new ValidationError("Invalid weight", parsed.error.issues);
  }
  const entry = updateWeight(db, userId, id, parsed.data);
  if (!entry) {
    throw new NotFoundError("Weight entry not found");
  }
  return entry;
}

export function remove(db: Db, userId: number, id: number): void {
  if (!deleteEntry(db, userId, id)) {
    throw new NotFoundError("Weight entry not found");
  }
}
