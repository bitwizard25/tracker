import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { getDb } from "@/server/db/client";
import { sessionResponse } from "@/server/http/authResponse";
import { authEmailRateLimit, authIpRateLimit } from "@/server/http/rateLimits";
import { compose } from "@/server/middleware/compose";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";
import { withValidation } from "@/server/middleware/withValidation";
import { register } from "@/server/services/auth.service";

export const POST = compose(
  withErrorHandler,
  authIpRateLimit(),
  withValidation({ body: registerSchema }),
  authEmailRateLimit(),
)(async (ctx) => sessionResponse(await register(getDb(), ctx.body as RegisterInput), 201));
