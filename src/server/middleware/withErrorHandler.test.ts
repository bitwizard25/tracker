import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConflictError, NotFoundError, RateLimitError, ValidationError } from "@/server/errors";
import { compose } from "./compose";
import { withErrorHandler } from "./withErrorHandler";

const call = (handler: () => Promise<Response>) =>
  compose(withErrorHandler)(handler)(new NextRequest("http://localhost/x"), {
    params: Promise.resolve({}),
  });

afterEach(() => vi.restoreAllMocks());

describe("withErrorHandler", () => {
  it("passes successful responses through", async () => {
    const res = await call(async () => new Response("fine", { status: 201 }));
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("fine");
  });

  it("maps AppError to its status and body", async () => {
    const res = await call(async () => {
      throw new ConflictError("dupe", { field: "email" });
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "CONFLICT", message: "dupe", details: { field: "email" } },
    });
  });

  it("omits details when the error has none", async () => {
    const res = await call(async () => {
      throw new NotFoundError();
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Not found" } });
  });

  it("maps ZodError to 400 with flattened issues", async () => {
    const res = await call(async () => {
      z.object({ name: z.string() }).parse({});
      return new Response();
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.fieldErrors.name).toHaveLength(1);
  });

  it("keeps a ValidationError's own details", async () => {
    const res = await call(async () => {
      throw new ValidationError("bad", { a: 1 });
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.details).toEqual({ a: 1 });
  });

  it("sets Retry-After for RATE_LIMITED", async () => {
    const res = await call(async () => {
      throw new RateLimitError("slow down", { retryAfterSeconds: 42 });
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("maps unknown errors to a generic 500 without leaking them", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const secret = new Error("SELECT * FROM users failed: secret-detail");
    const res = await call(async () => {
      throw secret;
    });
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
    expect(text).not.toContain("secret-detail");
    expect(text).not.toContain("stack");
    expect(spy).toHaveBeenCalledWith(expect.anything(), secret);
  });
});
