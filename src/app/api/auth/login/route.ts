import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { getDb } from "@/server/db/client";
import { sessionResponse } from "@/server/http/authResponse";
import { authEmailRateLimit, authIpRateLimit } from "@/server/http/rateLimits";
import { compose } from "@/server/middleware/compose";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";
import { withValidation } from "@/server/middleware/withValidation";
import { login } from "@/server/services/auth.service";

export const POST = compose(
  withErrorHandler,
  authIpRateLimit(),
  withValidation({ body: loginSchema }),
  authEmailRateLimit(),
)(async (ctx) => sessionResponse(await login(getDb(), ctx.body as LoginInput), 200));
