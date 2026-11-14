import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionToken,
} from "@/server/auth/adminSession";

/**
 * Admin Console & Subdomain Proxy (Next.js 16)
 *
 * 1. Subdomain routing: rewrites `admin.rilfreight.com/:path*` (or `admin.localhost:*`)
 *    internally to `/admin/:path*` so URLs appear cleanly as
 *    `admin.rilfreight.com/dashboard`, `admin.rilfreight.com/shipments`, etc.
 * 2. Redirects `/admin/*` on the admin subdomain to strip redundant `/admin` prefix.
 * 3. Enforces strict `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` on all admin responses.
 * 4. Production redirect: redirects `rilfreight.com/admin/*` to `https://admin.rilfreight.com/*`.
 * 5. Session authentication gate: rejects unauthenticated visitors before any page loads.
 */

const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get("host") || "").toLowerCase();

  const isAdminSubdomain =
    host.startsWith("admin.") ||
    host.includes("admin.rilfreight.com") ||
    host.includes("admin.localhost");

  // Bypass static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    const res = NextResponse.next();
    if (isAdminSubdomain || pathname.startsWith("/api/admin")) {
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
    }
    return res;
  }

  // ── CASE 1: Admin Subdomain (admin.rilfreight.com / admin.localhost) ──
  if (isAdminSubdomain) {
    // Strip redundant /admin prefix if typed
    if (pathname === "/admin") {
      const res = NextResponse.redirect(new URL("/dashboard", request.url));
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
      return res;
    }
    if (pathname.startsWith("/admin/")) {
      const stripped = pathname.replace(/^\/admin/, "") || "/dashboard";
      const res = NextResponse.redirect(new URL(`${stripped}${search}`, request.url));
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
      return res;
    }

    const session = verifySessionToken(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    );

    // Root of admin subdomain
    if (pathname === "/" || pathname === "") {
      const target = session ? "/dashboard" : "/login";
      const res = NextResponse.redirect(new URL(target, request.url));
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
      return res;
    }

    // Login route
    if (pathname === "/login") {
      if (session) {
        const res = NextResponse.redirect(new URL("/dashboard", request.url));
        res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
        return res;
      }
      const res = NextResponse.rewrite(new URL(`/admin/login${search}`, request.url));
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
      return res;
    }

    // Session check for all other admin routes
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/dashboard") {
        loginUrl.searchParams.set("next", `${pathname}${search}`);
      }
      const res = NextResponse.redirect(loginUrl);
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
      return res;
    }

    // Authenticated: internally rewrite /<page> to /admin/<page>
    const res = NextResponse.rewrite(new URL(`/admin${pathname}${search}`, request.url));
    res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
    return res;
  }

  // ── CASE 2: Main Domain (rilfreight.com or localhost:3000) ──
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isProduction =
      host.includes("rilfreight.com") && !host.includes("admin.rilfreight.com");

    // In production, redirect main domain /admin to admin.rilfreight.com
    if (isProduction) {
      const stripped = pathname.replace(/^\/admin/, "") || "/dashboard";
      const adminUrl = new URL(`https://admin.rilfreight.com${stripped}${search}`);
      const res = NextResponse.redirect(adminUrl);
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
      return res;
    }

    // Localhost development fallback
    const session = verifySessionToken(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value
    );

    if (pathname === "/admin/login") {
      if (session) {
        const res = NextResponse.redirect(new URL("/admin/dashboard", request.url));
        res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
        return res;
      }
      const res = NextResponse.next();
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
      return res;
    }

    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);
      if (pathname !== "/admin") {
        loginUrl.searchParams.set("next", `${pathname}${search}`);
      }
      const res = NextResponse.redirect(loginUrl);
      res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
      return res;
    }

    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
