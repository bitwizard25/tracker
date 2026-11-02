import type { NextRequest } from "next/server";
import { RateLimitError } from "@/server/errors";
import type { Middleware } from "./compose";

type Window = { count: number; resetAt: number };
type RateLimitOptions = {
  limit: number;
  windowMs: number;
  key?: (req: NextRequest) => string;
};

const stores = new Set<Map<string, Window>>();

export function resetRateLimits(): void {
  stores.forEach((store) => store.clear());
}

export function rateLimitStoreSize(): number {
  let size = 0;
  stores.forEach((store) => {
    size += store.size;
  });
  return size;
}

function clientIp(req: NextRequest): string {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "local";
}

function evictExpired(store: Map<string, Window>, now: number): void {
  for (const [key, window] of store) {
    if (window.resetAt <= now) store.delete(key);
  }
}

export function withRateLimit({ limit, windowMs, key = clientIp }: RateLimitOptions): Middleware {
  const store = new Map<string, Window>();
  stores.add(store);

  return (next) => async (ctx) => {
    const now = Date.now();
    evictExpired(store, now);
    const clientKey = key(ctx.req);
    const window = store.get(clientKey) ?? { count: 0, resetAt: now + windowMs };
    window.count += 1;
    store.set(clientKey, window);

    if (window.count > limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
      throw new RateLimitError("Too many requests, please try again later", { retryAfterSeconds });
    }
    return next(ctx);
  };
}
