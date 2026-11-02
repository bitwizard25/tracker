import { sharingSchema, type SharingInput } from "@/lib/validation/sharing";
import { getDb } from "@/server/db/client";
import { compose } from "@/server/middleware/compose";
import { withAuth } from "@/server/middleware/withAuth";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";
import { withValidation } from "@/server/middleware/withValidation";
import { setSharing } from "@/server/services/sharing.service";

export const PUT = compose(
  withErrorHandler,
  withAuth(),
  withValidation({ body: sharingSchema }),
)(async (ctx) => {
  const { share } = ctx.body as SharingInput;
  return Response.json({ user: setSharing(getDb(), ctx.user!.id, share) });
});
