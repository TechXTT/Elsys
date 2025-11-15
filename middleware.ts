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
  // Dynamic alias rewrite: /:locale/<alias> -> /:locale/<routePath[slug]>
  // Only when locale prefix is present and not admin/api/_next/static assets.
  const m = pathname.match(/^\/(bg|en)\/(.+)$/);
  if (m) {
    const locale = m[1];
    const rest = m[2].replace(/^\/+|\/+$/g, "");
    if (rest && !rest.startsWith("api/") && !rest.startsWith("_next/") && !rest.includes(".")) {
      try {
        const url = new URL(`/api/route-alias?locale=${encodeURIComponent(locale)}&path=${encodeURIComponent(rest)}`, req.url);
        const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json().catch(() => null) as { target?: string | null } | null;
          const target = data?.target?.replace(/^\/+|\/+$/g, "");
          if (target && target !== rest) {
            // Rewrite to the real route WITH locale prefix so App Router [locale] matches.
            const rewriteTo = new URL(`/${locale}/${target}`, req.url);
            return NextResponse.rewrite(rewriteTo);
          }
        }
      } catch {}
    }
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
