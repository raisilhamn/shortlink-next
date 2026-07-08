import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const session = req.auth;

  const isDashboard = path.startsWith("/dashboard");
  const isAdmin = path.startsWith("/admin");

  if (isDashboard || isAdmin) {
    if (!session?.user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", path);
      return NextResponse.redirect(loginUrl);
    }

    if (isAdmin && session.user.role !== "admin") {
      return NextResponse.rewrite(new URL("/forbidden", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
