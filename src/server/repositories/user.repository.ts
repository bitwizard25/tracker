import { eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { users } from "@/server/db/schema";

export type PublicUser = {
  id: number;
  email: string;
  displayName: string;
  goalType: "lose" | "gain";
  goalWeightKg: number | null;
  shareProgress: boolean;
};

export type NewUser = {
  email: string;
  passwordHash: string;
  displayName: string;
  goalType: "lose" | "gain";
  goalWeightKg?: number;
};

type UserRow = typeof users.$inferSelect;

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    goalType: row.goalType,
    goalWeightKg: row.goalWeightKg,
    shareProgress: row.shareProgress,
  };
}

export function createUser(db: Db, input: NewUser): PublicUser {
  const row = db
    .insert(users)
    .values({ ...input, goalWeightKg: input.goalWeightKg ?? null })
    .returning()
    .get();
  return toPublicUser(row);
}

export function findByEmail(
  db: Db,
  email: string,
): { user: PublicUser; passwordHash: string } | undefined {
  const row = db.select().from(users).where(eq(users.email, email)).get();
  return row && { user: toPublicUser(row), passwordHash: row.passwordHash };
}

export function findById(db: Db, id: number): PublicUser | undefined {
  const row = db.select().from(users).where(eq(users.id, id)).get();
  return row && toPublicUser(row);
}

export function setSharing(db: Db, userId: number, share: boolean): PublicUser | undefined {
  const row = db
    .update(users)
    .set({ shareProgress: share, shareConsentedAt: share ? new Date().toISOString() : null })
    .where(eq(users.id, userId))
    .returning()
    .get();
  return row && toPublicUser(row);
}
