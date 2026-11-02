import type { RouteContext } from "@/server/middleware/compose";
import { withRateLimit } from "@/server/middleware/withRateLimit";

const WINDOW_MS = 15 * 60_000;

export const authIpRateLimit = () => withRateLimit({ limit: 20, windowMs: WINDOW_MS });

export const authEmailRateLimit = () =>
  withRateLimit({
    limit: 10,
    windowMs: WINDOW_MS,
    key: (ctx: RouteContext) => (ctx.body as { email: string }).email.toLowerCase(),
  });
