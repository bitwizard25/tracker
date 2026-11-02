import { asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { users, weightEntries } from "@/server/db/schema";

export type SharingUser = {
  userId: number;
  displayName: string;
  goalType: "lose" | "gain";
  entries: { date: string; weightKg: number }[];
};

/**
 * The single choke point for the CONSENT RULE: only users with share_progress = 1
 * are ever returned. Social services must read other users exclusively through this.
 */
export function listSharingUsersWithEntries(db: Db): SharingUser[] {
  const rows = db
    .select({
      userId: users.id,
      displayName: users.displayName,
      goalType: users.goalType,
      date: weightEntries.entryDate,
      weightKg: weightEntries.weightKg,
    })
    .from(users)
    .leftJoin(weightEntries, eq(weightEntries.userId, users.id))
    .where(eq(users.shareProgress, true))
    .orderBy(asc(users.id), asc(weightEntries.entryDate))
    .all();

  const byUser = new Map<number, SharingUser>();
  for (const { userId, displayName, goalType, date, weightKg } of rows) {
    let user = byUser.get(userId);
    if (!user) {
      user = { userId, displayName, goalType, entries: [] };
      byUser.set(userId, user);
    }
    if (date !== null && weightKg !== null) user.entries.push({ date, weightKg });
  }
  return [...byUser.values()];
}
