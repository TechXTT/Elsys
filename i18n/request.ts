import {NextRequest} from "next/server";
import {cookies} from "next/headers";
import {getRequestConfig, RequestConfig} from "next-intl/server";

import {defaultLocale, locales} from "./config";

export default getRequestConfig(async ({locale}): Promise<RequestConfig> => {
  // Public routes are under /[locale] — next-intl supplies `locale` from the URL
  // path; we use it as-is (no cookie read → these pages stay static/ISR).
  let resolvedLocale = locales.includes(locale as any) ? (locale as (typeof locales)[number]) : null;

  // Admin routes are NOT under /[locale], so `locale` is absent. ONLY here do we
  // read the admin toggle's cookie (`admin-locale`, distinct from NEXT_LOCALE so
  // it can never hijack the public path-driven locale). cookies() is reached only
  // in this branch, so public pages never opt into dynamic rendering.
  if (!resolvedLocale) {
    const adminLocale = cookies().get("admin-locale")?.value;
    resolvedLocale = locales.includes(adminLocale as any) ? (adminLocale as (typeof locales)[number]) : defaultLocale;
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});

export function resolveLocaleFromRequest(request: NextRequest) {
  const requestLocale = request.nextUrl.pathname.split("/")[1];
  if (locales.includes(requestLocale as any)) {
    return requestLocale as (typeof locales)[number];
  }
  return defaultLocale;
}

