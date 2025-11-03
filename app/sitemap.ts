import type { MetadataRoute } from "next";

import { locales } from "@/i18n/config";

const base = "https://elsys.local";
const routes = ["", "/novini", "/blog"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const localizedEntries = locales.flatMap((locale) =>
    routes.map((route) => ({
      url: `${base}/${locale}${route}`,
      lastModified,
    })),
  );

  return [{ url: `${base}/`, lastModified }, ...localizedEntries];
}


