import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { getNewsPosts } from "@/lib/news";

export const revalidate = 300;

// Static top-level routes + the data-backed content routes (G2-2).
const routes = [
  "",
  "/novini",
  "/za-uchilishteto",
  "/priem",
  "/klubove",
  "/galeria",
  "/dokumenti",
  "/ekip",
  "/partnyori",
  "/evroproekti",
  "/nagradi",
  "/vipuski",
  "/kontakti",
];

// R2: the sitemap reads published content through publicWhere() (via
// getNewsPosts, which gates PUBLISHED + non-future date), rather than hardcoding.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries = locales.flatMap((locale) =>
    routes.map((route) => ({ url: absoluteUrl(`/${locale}${route}`), lastModified })),
  );

  const newsEntries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    const posts = await getNewsPosts(locale).catch(() => []);
    for (const p of posts) {
      newsEntries.push({
        url: absoluteUrl(`/${locale}/novini/${p.id}`),
        lastModified: p.date ? new Date(p.date) : lastModified,
      });
    }
  }

  return [{ url: absoluteUrl("/"), lastModified }, ...staticEntries, ...newsEntries];
}
