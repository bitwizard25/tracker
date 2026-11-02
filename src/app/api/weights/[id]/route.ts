import { updateWeightSchema, type UpdateWeightInput } from "@/lib/validation/weight";
import { getDb } from "@/server/db/client";
import { ValidationError } from "@/server/errors";
import { compose, type RouteContext } from "@/server/middleware/compose";
import { withAuth } from "@/server/middleware/withAuth";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";
import { withValidation } from "@/server/middleware/withValidation";
import { remove, update } from "@/server/services/weight.service";

function entryId(ctx: RouteContext): number {
  const id = Number(ctx.params.id);
  if (!/^[1-9]\d*$/.test(ctx.params.id) || !Number.isSafeInteger(id)) {
    throw new ValidationError("id must be a positive integer");
  }
  return id;
}

export const PATCH = compose(
  withErrorHandler,
  withAuth(),
  withValidation({ body: updateWeightSchema }),
)(async (ctx) => {
  const { weightKg } = ctx.body as UpdateWeightInput;
  return Response.json({ entry: update(getDb(), ctx.user!.id, entryId(ctx), weightKg) });
});

export const DELETE = compose(withErrorHandler, withAuth())(async (ctx) => {
  remove(getDb(), ctx.user!.id, entryId(ctx));
  return new Response(null, { status: 204 });
});
