import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE_NAME, isValidAdminSession } from "@/lib/admin-auth";

const ADMIN_LOGIN_PATH = "/admin/login";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  const authenticated = await isValidAdminSession(cookieValue);
  const isLoginPage = pathname === ADMIN_LOGIN_PATH;

  if (!authenticated && !isLoginPage) {
    const redirectUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (authenticated && isLoginPage) {
    const nextPath = request.nextUrl.searchParams.get("next") || "/admin";
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
