import { NextRequest } from "next/server";
import { z } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compose } from "./compose";
import { withErrorHandler } from "./withErrorHandler";
import { withValidation } from "./withValidation";
import { MAX_TRACKED_KEYS, rateLimitStoreSize, resetRateLimits, withRateLimit } from "./withRateLimit";

const params = { params: Promise.resolve({}) };

function build(limit = 2, windowMs = 60_000) {
  return compose(
    withErrorHandler,
    withRateLimit({ limit, windowMs }),
  )(async () => new Response("ok"));
}

function req(ip?: string): NextRequest {
  return new NextRequest("http://localhost/x", {
    headers: ip ? { "x-forwarded-for": ip } : {},
  });
}

describe("withRateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("blocks the (limit+1)th call with 429 and Retry-After", async () => {
    const route = build(2);
    expect((await route(req("1.1.1.1"), params)).status).toBe(200);
    expect((await route(req("1.1.1.1"), params)).status).toBe(200);
    vi.setSystemTime(new Date("2026-01-01T00:00:20Z"));
    const blocked = await route(req("1.1.1.1"), params);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("40");
    const { error } = await blocked.json();
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.details).toEqual({ retryAfterSeconds: 40 });
  });

  it("uses the rightmost x-forwarded-for value, so spoofing the left does not help", async () => {
    const route = build(1);
    expect((await route(req("6.6.6.6, 1.1.1.1"), params)).status).toBe(200);
    expect((await route(req("7.7.7.7, 2.2.2.2"), params)).status).toBe(200);
    expect((await route(req("8.8.8.8, 1.1.1.1"), params)).status).toBe(429);
  });

  it("honours TRUSTED_PROXY_HOPS and falls back for invalid values", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    const route = build(1);
    expect((await route(req("1.1.1.1, 2.2.2.2"), params)).status).toBe(200);
    expect((await route(req("1.1.1.1, 3.3.3.3"), params)).status).toBe(429);
    expect((await route(req("9.9.9.9"), params)).status).toBe(200);
    vi.stubEnv("TRUSTED_PROXY_HOPS", "0");
    resetRateLimits();
    expect((await route(req("1.1.1.1, 2.2.2.2"), params)).status).toBe(200);
    expect((await route(req("5.5.5.5, 2.2.2.2"), params)).status).toBe(429);
    vi.unstubAllEnvs();
  });

  it("blocks a per-email limiter across different IPs", async () => {
    const route = compose(
      withErrorHandler,
      withValidation({ body: z.object({ email: z.string() }) }),
      withRateLimit({ limit: 2, windowMs: 60_000, key: (ctx) => `email:${(ctx.body as { email: string }).email}` }),
    )(async () => new Response("ok"));
    const attempt = (ip: string) =>
      route(
        new NextRequest("http://localhost/x", {
          method: "POST",
          body: JSON.stringify({ email: "victim@x.co" }),
          headers: { "content-type": "application/json", "x-forwarded-for": ip },
        }),
        params,
      );
    expect((await attempt("1.1.1.1")).status).toBe(200);
    expect((await attempt("2.2.2.2")).status).toBe(200);
    expect((await attempt("3.3.3.3")).status).toBe(429);
  });

  it("stops evicting at the first live entry", async () => {
    const route = build(5, 1000);
    await route(req("1.0.0.1"), params);
    vi.setSystemTime(new Date("2026-01-01T00:00:00.600Z"));
    await route(req("1.0.0.2"), params);
    vi.setSystemTime(new Date("2026-01-01T00:00:01.100Z"));
    await route(req("1.0.0.3"), params);
    expect(rateLimitStoreSize()).toBe(2);
  });

  it("caps the store when many unique keys arrive", async () => {
    const route = build(5, 60_000);
    for (let i = 0; i < MAX_TRACKED_KEYS + 50; i++) await route(req(`ip-${i}`), params);
    expect(rateLimitStoreSize()).toBe(MAX_TRACKED_KEYS);
  });

  it("falls back to a shared 'local' key without the header", async () => {
    const route = build(1);
    expect((await route(req(), params)).status).toBe(200);
    expect((await route(req(), params)).status).toBe(429);
  });

  it("allows calls again after the window elapses", async () => {
    const route = build(1, 1000);
    await route(req("1.1.1.1"), params);
    expect((await route(req("1.1.1.1"), params)).status).toBe(429);
    vi.setSystemTime(new Date("2026-01-01T00:00:01.001Z"));
    expect((await route(req("1.1.1.1"), params)).status).toBe(200);
  });

  it("resetRateLimits clears all counters", async () => {
    const route = build(1);
    await route(req("1.1.1.1"), params);
    expect((await route(req("1.1.1.1"), params)).status).toBe(429);
    resetRateLimits();
    expect((await route(req("1.1.1.1"), params)).status).toBe(200);
  });

  it("evicts expired windows so the store does not grow unbounded", async () => {
    const route = build(5, 1000);
    for (let i = 0; i < 20; i++) await route(req(`10.0.0.${i}`), params);
    expect(rateLimitStoreSize()).toBe(20);
    vi.setSystemTime(new Date("2026-01-01T00:00:05Z"));
    await route(req("10.9.9.9"), params);
    expect(rateLimitStoreSize()).toBe(1);
  });

  it("keeps separate limits per middleware instance", async () => {
    const a = build(1);
    const b = build(1);
    await a(req("1.1.1.1"), params);
    expect((await b(req("1.1.1.1"), params)).status).toBe(200);
  });
});
