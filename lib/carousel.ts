import { prisma } from "./prisma";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";
import type { CarouselSlide } from "@/components/CarouselHero";

const CAROUSEL_CACHE_NAMESPACE = "carousel";
const LIST_TTL_MS = 60_000; // 60s memory / 300s Redis (lib/cache.ts)

interface CarouselRow {
  id: string;
  title: string;
  subtitle: string | null;
  imageDesktop: string;
  imageTablet: string | null;
  imagePhone: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  publishAt: Date | null;
  unpublishAt: Date | null;
}

function toSlide(row: CarouselRow): CarouselSlide {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageDesktop: row.imageDesktop,
    imageTablet: row.imageTablet,
    imagePhone: row.imagePhone,
    linkUrl: row.linkUrl,
    linkLabel: row.linkLabel,
  };
}

const isLive = (row: CarouselRow, now: Date) =>
  (!row.publishAt || row.publishAt <= now) && (!row.unpublishAt || row.unpublishAt > now);

/**
 * Published, in-window carousel slides for `locale`, ordered. Falls back to the
 * default locale when the requested one has none (mirrors lib/news.ts). Cached
 * via lib/cache.ts under the `carousel` namespace (explicit select).
 */
export async function getCarouselSlides(locale?: Locale): Promise<CarouselSlide[]> {
  const loc = (locale ?? defaultLocale) as string;
  const cacheKey = `${CAROUSEL_CACHE_NAMESPACE}:list:${loc}`;
  return getCached(cacheKey, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const now = new Date();
      const select = {
        id: true, title: true, subtitle: true, imageDesktop: true, imageTablet: true,
        imagePhone: true, linkUrl: true, linkLabel: true, publishAt: true, unpublishAt: true,
      } as const;
      const query = (l: string) =>
        (prisma as any).carousel.findMany({
          where: { locale: l, ...publicWhere() },
          orderBy: { order: "asc" },
          select,
        }) as Promise<CarouselRow[]>;

      let rows = (await query(loc)).filter((r) => isLive(r, now));
      if (rows.length === 0 && loc !== defaultLocale) {
        rows = (await query(defaultLocale)).filter((r) => isLive(r, now));
      }
      return rows.map(toSlide);
    },
  });
}
