import { flattenError, ZodError } from "zod";
import { AppError } from "@/server/errors";
import type { Middleware } from "./compose";

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
): Response {
  const error = details === undefined ? { code, message } : { code, message, details };
  return Response.json({ error }, { status, headers });
}

function retryAfterHeader(error: AppError): HeadersInit | undefined {
  if (error.code !== "RATE_LIMITED") return undefined;
  const details = error.details as { retryAfterSeconds?: unknown } | undefined;
  return typeof details?.retryAfterSeconds === "number"
    ? { "Retry-After": String(details.retryAfterSeconds) }
    : undefined;
}

export const withErrorHandler: Middleware = (next) => async (ctx) => {
  try {
    return await next(ctx);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.status, error.code, error.message, error.details, retryAfterHeader(error));
    }
    if (error instanceof ZodError) {
      return errorResponse(400, "VALIDATION_ERROR", "Invalid request", flattenError(error));
    }
    console.error("Unhandled error in route handler", error);
    return errorResponse(500, "INTERNAL_ERROR", "Internal server error");
  }
};
