import { locales, defaultLocale, type Locale } from "@/i18n/config";

/** Public origin used for canonical URLs, hreflang alternates, and JSON-LD. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://elsys.local").replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Dynamic OG-image URL for a title (rendered by app/og/route.tsx). R2. */
export function ogImageUrl(title: string, subtitle?: string): string {
  const qs = new URLSearchParams({ title });
  if (subtitle) qs.set("subtitle", subtitle);
  return absoluteUrl(`/og?${qs.toString()}`);
}

/** Common SEO fields stored on Page/NewsPost (R2). */
export interface SeoFields {
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  noindex?: boolean | null;
  canonical?: string | null;
}

/**
 * Apply SEO overrides onto a base Next Metadata object (R2). Overrides title/
 * description, sets robots noindex, overrides the canonical, and picks the OG
 * image (explicit ogImage → fallbackImage → generated /og card).
 */
export function applySeo(
  base: import("next").Metadata,
  seo: SeoFields | null | undefined,
  opts: { title: string; description?: string; fallbackImage?: string },
): import("next").Metadata {
  const title = seo?.metaTitle?.trim() || opts.title;
  const description = seo?.metaDescription?.trim() || opts.description;
  const ogImg = seo?.ogImage?.trim() || opts.fallbackImage || ogImageUrl(title);
  const meta: import("next").Metadata = {
    ...base,
    title,
    description,
    openGraph: { ...(base.openGraph ?? {}), title, description, images: [{ url: ogImg.startsWith("http") ? ogImg : absoluteUrl(ogImg) }] },
  };
  if (seo?.noindex) meta.robots = { index: false, follow: false };
  if (seo?.canonical?.trim()) {
    meta.alternates = { ...(base.alternates ?? {}), canonical: seo.canonical.trim() };
  }
  return meta;
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
