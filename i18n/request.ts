import {NextRequest} from "next/server";
import {getRequestConfig, RequestConfig} from "next-intl/server";

import {defaultLocale, locales} from "./config";

export default getRequestConfig(async ({locale}): Promise<RequestConfig> => {
  const resolvedLocale = locales.includes(locale as any) ? locale : defaultLocale;

  return {
    locale: resolvedLocale as (typeof locales)[number],
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

