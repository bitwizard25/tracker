import { NextResponse } from "next/server";
import { compose } from "@/server/middleware/compose";
import { withErrorHandler } from "@/server/middleware/withErrorHandler";
import { SESSION_COOKIE, sessionCookieOptions } from "@/server/session";

export const POST = compose(withErrorHandler)(async () => {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
});
