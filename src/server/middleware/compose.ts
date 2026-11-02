import type { NextRequest } from "next/server";
import type { PublicUser } from "@/server/repositories/user.repository";

export type RouteContext<T = unknown> = {
  req: NextRequest;
  params: Record<string, string>;
  user?: PublicUser;
  body?: T;
  query?: Record<string, unknown>;
};

export type Handler = (ctx: RouteContext) => Promise<Response>;
export type Middleware = (next: Handler) => Handler;

export type RouteFunction = (
  req: NextRequest,
  routeCtx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

export function compose(...middlewares: Middleware[]): (handler: Handler) => RouteFunction {
  return (handler) => {
    const chain = middlewares.reduceRight<Handler>((next, mw) => mw(next), handler);
    return async (req, routeCtx) => chain({ req, params: await routeCtx.params });
  };
}
