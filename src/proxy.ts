import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic pre-filter only: it checks for the presence of an Auth.js session
// cookie so unauthenticated users are bounced before a protected route renders.
// It intentionally does NOT decode or trust the cookie — the real authentication
// and role checks live in the server-side layouts (dashboard/layout.tsx,
// admin/layout.tsx), per Next's guidance that proxy is for optimistic checks.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export default function proxy(req: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => req.cookies.has(name));

  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
