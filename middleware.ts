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
    // Mandatory 2FA gate (CLAUDE.md #3 / G5-1): un-enrolled high-privilege roles
    // (ADMIN, STUDENT_ADMIN) are blocked from all admin routes except the setup
    // page until 2FA is enabled. TEACHER/STUDENT_EDITOR are not gated. Sign-out
    // lives at /api/auth/* (outside this matcher), so logout always works.
    const role = (token as any).role;
    const requires2fa = role === "ADMIN" || role === "STUDENT_ADMIN";
    if (requires2fa && !(token as any).twoFactorEnabled && !pathname.startsWith("/admin/security")) {
      return NextResponse.redirect(new URL("/admin/security", req.url));
    }
    return NextResponse.next();
  }
  // Route-alias resolution lives in the app/[locale]/[...slug] resolver now
  // (lib/routes.ts, `routes` cache namespace). Middleware stays out of Prisma
  // and never self-fetches — it only auth-gates /admin and runs next-intl.
  const res = intlMiddleware(req);

  // Redirects (e.g. "/" → "/bg", or a prefix-less path → "/bg/…") pass through
  // untouched; the redirected request re-enters middleware and gets the header.
  if (res.headers.has("location")) return res;

  // Expose the resolved URL locale to the ROOT layout as a request header so it
  // can set a correct <html lang> per URL on a cold request (WCAG 3.1.1). The
  // root layout can't read the route locale itself (it's a child segment).
  // localePrefix is "always", so the first path segment is the locale.
  const seg = pathname.split("/")[1];
  const locale = (locales as readonly string[]).includes(seg) ? seg : defaultLocale;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-next-locale", locale);
  const out = NextResponse.next({ request: { headers: requestHeaders } });
  // Carry over next-intl's response cookies (e.g. NEXT_LOCALE).
  for (const cookie of res.cookies.getAll()) out.cookies.set(cookie);
  return out;
}

export const config = {
  matcher: [
    "/",
    "/(bg|en)/:path*",
    "/((?!api|_next|og|.*\\..*|admin).*)",
    "/admin/:path*",
  ],
};
