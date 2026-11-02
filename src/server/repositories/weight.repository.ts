import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { weightEntries } from "@/server/db/schema";

export type WeightEntry = { id: number; entryDate: string; weightKg: number };

const entryColumns = {
  id: weightEntries.id,
  entryDate: weightEntries.entryDate,
  weightKg: weightEntries.weightKg,
};

export type DateRange = { from?: string; to?: string };

export function listByUserBetween(db: Db, userId: number, range: DateRange = {}): WeightEntry[] {
  return db
    .select(entryColumns)
    .from(weightEntries)
    .where(
      and(
        eq(weightEntries.userId, userId),
        range.from ? gte(weightEntries.entryDate, range.from) : undefined,
        range.to ? lte(weightEntries.entryDate, range.to) : undefined,
      ),
    )
    .orderBy(asc(weightEntries.entryDate))
    .all();
}

export function listByUser(db: Db, userId: number): WeightEntry[] {
  return listByUserBetween(db, userId);
}

export function upsertEntry(
  db: Db,
  userId: number,
  entryDate: string,
  weightKg: number,
): { entry: WeightEntry; created: boolean } {
  return db.transaction((tx) => {
    const existing = tx
      .select({ id: weightEntries.id })
      .from(weightEntries)
      .where(and(eq(weightEntries.userId, userId), eq(weightEntries.entryDate, entryDate)))
      .get();
    if (existing) {
      const entry = tx
        .update(weightEntries)
        .set({ weightKg })
        .where(eq(weightEntries.id, existing.id))
        .returning(entryColumns)
        .get();
      return { entry, created: false };
    }
    const entry = tx
      .insert(weightEntries)
      .values({ userId, entryDate, weightKg })
      .returning(entryColumns)
      .get();
    return { entry, created: true };
  });
}

export function updateWeight(
  db: Db,
  userId: number,
  id: number,
  weightKg: number,
): WeightEntry | undefined {
  return db
    .update(weightEntries)
    .set({ weightKg })
    .where(and(eq(weightEntries.id, id), eq(weightEntries.userId, userId)))
    .returning(entryColumns)
    .get();
}

export function deleteEntry(db: Db, userId: number, id: number): boolean {
  const result = db
    .delete(weightEntries)
    .where(and(eq(weightEntries.id, id), eq(weightEntries.userId, userId)))
    .run();
  return result.changes > 0;
}
