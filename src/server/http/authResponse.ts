import { NextResponse } from "next/server";
import type { PublicUser } from "@/server/repositories/user.repository";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/server/session";

export async function sessionResponse(user: PublicUser, status: number): Promise<NextResponse> {
  const response = NextResponse.json({ user }, { status });
  response.cookies.set(SESSION_COOKIE, await signSession(user.id), sessionCookieOptions);
  return response;
}
