import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = ["/dashboard", "/settings", "/change-password"];

export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const hasAccessCookie = request.cookies.has("effect_access");
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !hasAccessCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (pathname === "/login" && hasAccessCookie && !searchParams.has("recovery")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/login", "/dashboard/:path*", "/settings/:path*", "/change-password"] };
