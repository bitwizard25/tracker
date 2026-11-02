import { todayUtc } from "@/lib/date";
import { getDb } from "@/server/db/client";
import { compose } from "@/server/middleware/compose";
import { withAuth } from "@/server/middleware/withAuth";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";
import { getLeaderboard } from "@/server/services/leaderboard.service";

export const GET = compose(withErrorHandler, withAuth())(async (ctx) =>
  Response.json({ entries: getLeaderboard(getDb(), ctx.user!.id, todayUtc()) }),
);
