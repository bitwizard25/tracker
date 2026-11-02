import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { compose } from "./compose";
import { withErrorHandler } from "./withErrorHandler";
import { withValidation } from "./withValidation";

const bodySchema = z.object({ name: z.string().min(2), n: z.number() });
const querySchema = z.object({ page: z.coerce.number().int().min(1) });

const route = compose(
  withErrorHandler,
  withValidation({ body: bodySchema, query: querySchema }),
)(async (ctx) => Response.json({ body: ctx.body, query: ctx.query }));

const bodyOnly = compose(
  withErrorHandler,
  withValidation({ body: bodySchema }),
)(async (ctx) => Response.json({ body: ctx.body, query: ctx.query ?? null }));

const params = { params: Promise.resolve({}) };

function post(url: string, body: string, contentType: string | null = "application/json"): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body,
    headers: contentType ? { "content-type": contentType } : {},
  });
}

describe("withValidation", () => {
  it("parses a good body and query", async () => {
    const res = await route(post("http://localhost/x?page=2", JSON.stringify({ name: "Al", n: 1 })), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ body: { name: "Al", n: 1 }, query: { page: 2 } });
  });

  it("rejects a bad body with VALIDATION_ERROR and issue details", async () => {
    const res = await route(post("http://localhost/x?page=1", JSON.stringify({ name: "A", n: "x" })), params);
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(error.details.fieldErrors).sort()).toEqual(["n", "name"]);
  });

  it("rejects a bad query", async () => {
    const res = await route(post("http://localhost/x?page=0", JSON.stringify({ name: "Al", n: 1 })), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error.details.fieldErrors.page).toBeDefined();
  });

  it("rejects a missing required query param", async () => {
    const res = await route(post("http://localhost/x", JSON.stringify({ name: "Al", n: 1 })), params);
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await bodyOnly(post("http://localhost/x", "{not json"), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects text/plain even when the body is valid JSON", async () => {
    const res = await bodyOnly(post("http://localhost/x", JSON.stringify({ name: "Al", n: 1 }), "text/plain"), params);
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe("Content-Type must be application/json");
  });

  it("rejects a missing Content-Type", async () => {
    const req = new NextRequest("http://localhost/x", {
      method: "POST",
      body: new Blob([JSON.stringify({ name: "Al", n: 1 })]),
    });
    req.headers.delete("content-type");
    expect((await bodyOnly(req, params)).status).toBe(400);
  });

  it("accepts application/json with parameters in any case", async () => {
    const res = await bodyOnly(
      post("http://localhost/x", JSON.stringify({ name: "Al", n: 1 }), "Application/JSON; charset=utf-8"),
      params,
    );
    expect(res.status).toBe(200);
  });

  it("rejects an empty body when a body schema is given", async () => {
    const res = await bodyOnly(new NextRequest("http://localhost/x", { method: "POST" }), params);
    expect(res.status).toBe(400);
  });

  it("skips body parsing when no body schema is given", async () => {
    const queryOnly = compose(
      withErrorHandler,
      withValidation({ query: querySchema }),
    )(async (ctx) => Response.json({ body: ctx.body ?? null, query: ctx.query }));
    const res = await queryOnly(new NextRequest("http://localhost/x?page=3"), params);
    expect(await res.json()).toEqual({ body: null, query: { page: 3 } });
  });
});
