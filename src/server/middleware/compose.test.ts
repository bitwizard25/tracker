import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { compose, type Middleware } from "./compose";

describe("compose", () => {
  it("runs the first middleware outermost", async () => {
    const log: string[] = [];
    const tag =
      (name: string): Middleware =>
      (next) =>
      async (ctx) => {
        log.push(`${name}:in`);
        const res = await next(ctx);
        log.push(`${name}:out`);
        return res;
      };
    const route = compose(tag("a"), tag("b"), tag("c"))(async () => {
      log.push("handler");
      return new Response("ok");
    });

    const res = await route(new NextRequest("http://localhost/api/x"), { params: Promise.resolve({}) });

    expect(await res.text()).toBe("ok");
    expect(log).toEqual(["a:in", "b:in", "c:in", "handler", "c:out", "b:out", "a:out"]);
  });

  it("awaits route params into the context", async () => {
    const route = compose()(async (ctx) => Response.json({ params: ctx.params, url: ctx.req.url }));
    const res = await route(new NextRequest("http://localhost/api/w/7"), {
      params: Promise.resolve({ id: "7" }),
    });
    expect(await res.json()).toEqual({ params: { id: "7" }, url: "http://localhost/api/w/7" });
  });

  it("lets a middleware pass data to the handler via ctx", async () => {
    const addBody: Middleware = (next) => (ctx) => next({ ...ctx, body: 5 });
    const route = compose(addBody)(async (ctx) => Response.json({ body: ctx.body }));
    const res = await route(new NextRequest("http://localhost/x"), { params: Promise.resolve({}) });
    expect(await res.json()).toEqual({ body: 5 });
  });
});
