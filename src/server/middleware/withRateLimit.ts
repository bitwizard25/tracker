import { RateLimitError } from "@/server/errors";
import type { Middleware, RouteContext } from "./compose";

type Window = { count: number; resetAt: number };
type RateLimitOptions = {
  limit: number;
  windowMs: number;
  key?: (ctx: RouteContext) => string;
};

export const MAX_TRACKED_KEYS = 10_000;

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

/**
 * Client IP taken from the RIGHT of x-forwarded-for: the value the Nth-nearest trusted proxy
 * appended, where N = TRUSTED_PROXY_HOPS (default 1). The leftmost values are client-supplied
 * and must not be trusted. This is only reliable behind exactly that many proxies that append
 * to the header; in a direct deployment a client controls the whole header, so the real defence
 * there is a per-email limiter stacked after validation.
 */
function clientIp(ctx: RouteContext): string {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS);
  const trusted = Number.isInteger(hops) && hops >= 1 ? hops : 1;
  const values = (ctx.req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) return "local";
  return values[Math.max(0, values.length - trusted)];
}

// Within one store the window length is constant and expired keys are removed before being
// re-inserted, so insertion order equals expiry order: only the front can be expired.
function evictExpired(store: Map<string, Window>, now: number): void {
  for (const [key, window] of store) {
    if (window.resetAt > now) break;
    store.delete(key);
  }
}

function enforceCap(store: Map<string, Window>): void {
  while (store.size > MAX_TRACKED_KEYS) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) return;
    store.delete(oldest);
  }
}

export function withRateLimit({ limit, windowMs, key = clientIp }: RateLimitOptions): Middleware {
  const store = new Map<string, Window>();
  stores.add(store);

  return (next) => async (ctx) => {
    const now = Date.now();
    evictExpired(store, now);
    const clientKey = key(ctx);
    const window = store.get(clientKey) ?? { count: 0, resetAt: now + windowMs };
    window.count += 1;
    store.set(clientKey, window);
    enforceCap(store);

    if (window.count > limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((window.resetAt - now) / 1000));
      throw new RateLimitError("Too many requests, please try again later", { retryAfterSeconds });
    }
    return next(ctx);
  };
}
