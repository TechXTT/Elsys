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
    return NextResponse.next();
  }
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
