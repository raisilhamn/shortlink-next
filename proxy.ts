import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const session = (req as any).auth;

  const isDashboard = path.startsWith("/dashboard");
  const isAdmin = path.startsWith("/admin");

  if (isDashboard || isAdmin) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isAdmin && (session.user as any).role !== "admin") {
      return NextResponse.rewrite(new URL("/forbidden", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
