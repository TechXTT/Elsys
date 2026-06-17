import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";

// Public Award reads (G2-2 type, D-10). Yearly-append list. Mirrors lib/news.ts.

const AWARDS_CACHE_NAMESPACE = "awards";
const LIST_TTL_MS = 60_000;

export interface AwardView {
  id: string;
  title: string;
  description?: string;
  image?: string;
  year: number;
  category?: string;
}

/** Published awards for a locale, newest year first, cached. */
export async function getAwards(locale?: Locale): Promise<AwardView[]> {
  const loc = (locale ?? defaultLocale) as string;
  return getCached(`awards:list:${loc}:pub`, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const rows = await prisma.award.findMany({
        where: { locale: loc, ...publicWhere() },
        select: { id: true, title: true, description: true, image: true, year: true, category: true },
        orderBy: [{ year: "desc" }, { order: "asc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? undefined,
        image: r.image ?? undefined,
        year: r.year,
        category: r.category ?? undefined,
      }));
    },
  });
}

export async function invalidateAwardsCache(): Promise<void> {
  await bumpCacheVersion(AWARDS_CACHE_NAMESPACE);
}

export async function revalidateAwards(): Promise<void> {
  await invalidateAwardsCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) revalidatePath(`/${loc}/nagradi`);
}
