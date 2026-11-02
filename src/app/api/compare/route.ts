import { todayUtc } from "@/lib/date";
import { compareQuerySchema, type CompareQuery } from "@/lib/validation/compare";
import { getDb } from "@/server/db/client";
import { compose } from "@/server/middleware/compose";
import { withAuth } from "@/server/middleware/withAuth";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";
import { withValidation } from "@/server/middleware/withValidation";
import { getComparison } from "@/server/services/compare.service";

export const GET = compose(
  withErrorHandler,
  withAuth(),
  withValidation({ query: compareQuerySchema }),
)(async (ctx) => {
  const { userIds } = ctx.query as CompareQuery;
  return Response.json({ series: getComparison(getDb(), ctx.user!.id, userIds, todayUtc()) });
});
