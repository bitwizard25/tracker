import { getDb, type Db } from "@/server/db/client";
import { UnauthorizedError } from "@/server/errors";
import { findById } from "@/server/repositories/user.repository";
import { SESSION_COOKIE, verifySession } from "@/server/session";
import type { Middleware } from "./compose";

export function withAuth(deps: { db?: Db } = {}): Middleware {
  return (next) => async (ctx) => {
    const token = ctx.req.cookies.get(SESSION_COOKIE)?.value;
    const userId = token ? await verifySession(token) : null;
    const user = userId === null ? undefined : findById(deps.db ?? getDb(), userId);
    if (!user) throw new UnauthorizedError();
    return next({ ...ctx, user });
  };
}
