import type { ZodType } from "zod";
import { ValidationError } from "@/server/errors";
import type { Middleware } from "./compose";

type Schemas = { body?: ZodType; query?: ZodType };

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
}

export function withValidation(schemas: Schemas): Middleware {
  return (next) => async (ctx) => {
    const nextCtx = { ...ctx };
    if (schemas.body) {
      nextCtx.body = schemas.body.parse(await readJson(ctx.req));
    }
    if (schemas.query) {
      const raw = Object.fromEntries(ctx.req.nextUrl.searchParams);
      nextCtx.query = schemas.query.parse(raw) as Record<string, unknown>;
    }
    return next(nextCtx);
  };
}
