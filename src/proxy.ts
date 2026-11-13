import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/server/auth/adminSession";

/**
 * Admin console route guard.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy`. This file
 * runs before any admin route is rendered and answers one question: does this
 * request carry a valid admin session?
 *
 *   - `/admin/login`  → allowed through when there is no session, redirected
 *                       to the dashboard when there is one.
 *   - `/admin/*`      → allowed when the session cookie is valid, otherwise
 *                       redirected to `/admin/login` with a `next` parameter so
 *                       the operator lands back where they were headed.
 *
 * This is the first of two gates. The second is the live Firebase session
 * held by the browser (see `AdminAuthProvider`), and the third is Firestore
 * Security Rules, which gate the data itself.
 */

const LOGIN_PATH = "/admin/login";
const DASHBOARD_PATH = "/admin/dashboard";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const session = verifySessionToken(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  );

  if (pathname === LOGIN_PATH) {
    if (session) {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
