import { locales, defaultLocale, type Locale } from "@/i18n/config";

/** Public origin used for canonical URLs, hreflang alternates, and JSON-LD. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://elsys.local").replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * canonical + hreflang alternates for a locale-relative path (no leading
 * locale). e.g. localePath("bg", "/novini") → /bg/novini for every locale.
 */
export function alternatesFor(locale: Locale, path: string): { canonical: string; languages: Record<string, string> } {
  const clean = path.replace(/^\//, "");
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = absoluteUrl(`/${loc}${clean ? `/${clean}` : ""}`);
  languages["x-default"] = absoluteUrl(`/${defaultLocale}${clean ? `/${clean}` : ""}`);
  return { canonical: absoluteUrl(`/${locale}${clean ? `/${clean}` : ""}`), languages };
}
