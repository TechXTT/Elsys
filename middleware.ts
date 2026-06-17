import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";

import { defaultLocale, localePrefix, locales } from "@/i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Bypass i18n for one-time secret reveal links to ensure they live at /one-time/* (no locale prefix)
  if (pathname.startsWith("/one-time")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) {
      return NextResponse.next();
    }
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const loginUrl = new URL("/admin/login", req.url);
      if (!loginUrl.searchParams.has("callbackUrl")) {
        loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      }
      return NextResponse.redirect(loginUrl);
    }
    // Mandatory 2FA gate (CLAUDE.md #3): an un-enrolled ADMIN is blocked from all
    // admin routes except the setup page until 2FA is enabled. Sign-out lives at
    // /api/auth/* (outside this matcher), so logout always works.
    if ((token as any).role === "ADMIN" && !(token as any).twoFactorEnabled && !pathname.startsWith("/admin/security")) {
      return NextResponse.redirect(new URL("/admin/security", req.url));
    }
    return NextResponse.next();
  }
  // Route-alias resolution lives in the app/[locale]/[...slug] resolver now
  // (lib/routes.ts, `routes` cache namespace). Middleware stays out of Prisma
  // and never self-fetches — it only auth-gates /admin and runs next-intl.
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/",
    "/(bg|en)/:path*",
    "/((?!api|_next|.*\\..*|admin).*)",
    "/admin/:path*",
  ],
};
