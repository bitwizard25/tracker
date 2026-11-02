import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compose } from "./compose";
import { withErrorHandler } from "./withErrorHandler";
import { rateLimitStoreSize, resetRateLimits, withRateLimit } from "./withRateLimit";

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

  it("counts clients separately and uses the first x-forwarded-for value", async () => {
    const route = build(1);
    expect((await route(req("1.1.1.1, 9.9.9.9"), params)).status).toBe(200);
    expect((await route(req("2.2.2.2"), params)).status).toBe(200);
    expect((await route(req("1.1.1.1, 8.8.8.8"), params)).status).toBe(429);
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
