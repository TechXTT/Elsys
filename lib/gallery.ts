import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";

// Public GalleryItem reads (G2-2 type). Mirrors lib/news.ts caching contract.

const GALLERY_CACHE_NAMESPACE = "gallery";
const LIST_TTL_MS = 60_000;

export interface GalleryItemView {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  alt: string;
  album?: string;
}

const GALLERY_SELECT = {
  id: true,
  slug: true,
  title: true,
  imageUrl: true,
  alt: true,
  album: true,
} as const;

/** Published gallery items for a locale, ordered, cached. */
export async function getGalleryItems(locale?: Locale): Promise<GalleryItemView[]> {
  const loc = (locale ?? defaultLocale) as string;
  return getCached(`gallery:list:${loc}:pub`, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const rows = await prisma.galleryItem.findMany({
        where: { locale: loc, ...publicWhere() },
        select: GALLERY_SELECT,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        imageUrl: r.imageUrl,
        alt: r.alt ?? r.title,
        album: r.album ?? undefined,
      }));
    },
  });
}

export async function invalidateGalleryCache(): Promise<void> {
  await bumpCacheVersion(GALLERY_CACHE_NAMESPACE);
}

export async function revalidateGallery(): Promise<void> {
  await invalidateGalleryCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) revalidatePath(`/${loc}/galeria`);
}
