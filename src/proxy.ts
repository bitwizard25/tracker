import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/session";

const GUEST_PAGES = ["/login", "/register"];

// Optimistic redirect only: checks cookie presence, never validity. Real auth is withAuth.
export function proxy(req: NextRequest): NextResponse {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isGuestPage = GUEST_PAGES.includes(req.nextUrl.pathname);

  if (hasSession === isGuestPage) {
    return NextResponse.redirect(new URL(isGuestPage ? "/dashboard" : "/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/log/:path*", "/settings/:path*", "/login", "/register"],
};
