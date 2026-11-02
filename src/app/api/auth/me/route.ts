import { compose } from "@/server/middleware/compose";
import { withAuth } from "@/server/middleware/withAuth";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";

export const GET = compose(withErrorHandler, withAuth())(async (ctx) =>
  Response.json({ user: ctx.user }),
);
