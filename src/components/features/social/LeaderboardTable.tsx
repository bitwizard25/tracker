import { cn } from "@/lib/cn";
import { formatSignedPct } from "@/lib/format";
import type { LeaderboardEntry } from "@/lib/types";

export function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-3 text-sm text-muted">
        Nobody has shared their progress yet. Once members opt in, the leaderboard appears here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[22rem] text-left text-sm">
          <caption className="sr-only">Leaderboard of members who share their progress</caption>
          <thead className="text-xs text-muted">
            <tr>
              <th scope="col" className="py-2 pr-2 pl-2 font-medium">
                Rank
              </th>
              <th scope="col" className="py-2 pr-2 font-medium">
                Name
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                Progress
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                Consistency
              </th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((entry) => (
              <tr
                key={entry.userId}
                aria-current={entry.isYou ? "true" : undefined}
                className={cn(entry.isYou && "bg-brand-soft font-semibold")}
              >
                <td className="py-2.5 pr-2 pl-2 tabular-nums">{entry.rank}</td>
                <td className="py-2.5 pr-2">
                  {entry.displayName}
                  {entry.isYou && (
                    <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
                      You
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">
                  {formatSignedPct(entry.progressPct)}
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">
                  {Math.round(entry.consistencyPct)}%
                </td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{entry.score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Score: 70% weight change toward your goal, 30% logging consistency over the last 30 days.
      </p>
    </div>
  );
}
