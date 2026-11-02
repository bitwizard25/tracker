import { todayUtc } from "@/lib/date";
import {
  createWeightSchema,
  weightRangeQuerySchema,
  type CreateWeightInput,
  type WeightRange,
} from "@/lib/validation/weight";
import { getDb } from "@/server/db/client";
import { compose } from "@/server/middleware/compose";
import { withAuth } from "@/server/middleware/withAuth";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";
import { withValidation } from "@/server/middleware/withValidation";
import { list, logWeight } from "@/server/services/weight.service";

export const GET = compose(
  withErrorHandler,
  withAuth(),
  withValidation({ query: weightRangeQuerySchema }),
)(async (ctx) =>
  Response.json({ entries: list(getDb(), ctx.user!.id, ctx.query as WeightRange) }),
);

export const POST = compose(
  withErrorHandler,
  withAuth(),
  withValidation({ body: createWeightSchema }),
)(async (ctx) => {
  const { entry, created } = logWeight(
    getDb(),
    ctx.user!.id,
    ctx.body as CreateWeightInput,
    todayUtc(),
  );
  return Response.json({ entry }, { status: created ? 201 : 200 });
});
