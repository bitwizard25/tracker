import { toPercentSeries, type PercentPoint } from "@/lib/domain/progress";
import type { Db } from "@/server/db/client";
import { listSharingUsersWithEntries } from "@/server/repositories/social.repository";
import { findById } from "@/server/repositories/user.repository";
import { listByUser } from "@/server/repositories/weight.repository";
import { getLeaderboard } from "./leaderboard.service";

export type ComparisonSeries = {
  userId: number;
  displayName: string;
  isYou: boolean;
  points: PercentPoint[];
};

const MAX_OTHERS = 5;
const DEFAULT_OTHERS = 4;

function ownSeries(db: Db, viewerId: number): ComparisonSeries[] {
  const viewer = findById(db, viewerId);
  const entries = listByUser(db, viewerId);
  if (!viewer || entries.length === 0) return [];
  const points = toPercentSeries(entries.map((e) => ({ date: e.entryDate, weightKg: e.weightKg })));
  return [{ userId: viewerId, displayName: viewer.displayName, isYou: true, points }];
}

export function getComparison(
  db: Db,
  viewerId: number,
  requestedIds: number[],
  today: string,
): ComparisonSeries[] {
  const sharing = new Map(
    listSharingUsersWithEntries(db)
      .filter((user) => user.entries.length > 0 && user.userId !== viewerId)
      .map((user) => [user.userId, user]),
  );

  const otherIds =
    requestedIds.length > 0
      ? [...new Set(requestedIds)]
      : getLeaderboard(db, viewerId, today)
          .filter((entry) => !entry.isYou)
          .slice(0, DEFAULT_OTHERS)
          .map((entry) => entry.userId);

  const others = otherIds
    .flatMap((id) => sharing.get(id) ?? [])
    .slice(0, MAX_OTHERS)
    .map((user) => ({
      userId: user.userId,
      displayName: user.displayName,
      isYou: false,
      points: toPercentSeries(user.entries),
    }));

  return [...ownSeries(db, viewerId), ...others];
}
