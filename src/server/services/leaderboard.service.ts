import { directionalChangePct } from "@/lib/domain/progress";
import { consistencyScore, leaderboardScore, progressScore } from "@/lib/domain/scoring";
import type { Db } from "@/server/db/client";
import { listSharingUsersWithEntries } from "@/server/repositories/social.repository";

export type LeaderboardEntry = {
  rank: number;
  userId: number;
  displayName: string;
  progressPct: number;
  consistencyPct: number;
  score: number;
  isYou: boolean;
};

export function getLeaderboard(db: Db, viewerId: number, today: string): LeaderboardEntry[] {
  return listSharingUsersWithEntries(db)
    .filter((user) => user.entries.length > 0)
    .map((user) => {
      const first = user.entries[0].weightKg;
      const latest = user.entries[user.entries.length - 1].weightKg;
      const progressPct = progressScore(directionalChangePct(user.goalType, first, latest));
      const consistencyPct = consistencyScore(
        user.entries.map((e) => e.date),
        today,
      );
      return {
        userId: user.userId,
        displayName: user.displayName,
        progressPct,
        consistencyPct,
        score: leaderboardScore(progressPct, consistencyPct),
        isYou: user.userId === viewerId,
      };
    })
    .sort(
      (a, b) => b.score - a.score || b.consistencyPct - a.consistencyPct || a.userId - b.userId,
    )
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}
