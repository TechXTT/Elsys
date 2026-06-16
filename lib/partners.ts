import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";

// Public Partner reads (G2-2 type). Mirrors lib/news.ts caching contract.

const PARTNERS_CACHE_NAMESPACE = "partners";
const LIST_TTL_MS = 60_000;

export interface PartnerView {
  id: string;
  name: string;
  logo: string;
  url?: string;
  category?: string;
}

const PARTNER_SELECT = {
  id: true,
  name: true,
  logo: true,
  url: true,
  category: true,
} as const;

/** Published partners for a locale, ordered, cached. */
export async function getPartners(locale?: Locale): Promise<PartnerView[]> {
  const loc = (locale ?? defaultLocale) as string;
  return getCached(`partners:list:${loc}:pub`, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const rows = await prisma.partner.findMany({
        where: { locale: loc, ...publicWhere() },
        select: PARTNER_SELECT,
        orderBy: [{ order: "asc" }, { name: "asc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        logo: r.logo,
        url: r.url ?? undefined,
        category: r.category ?? undefined,
      }));
    },
  });
}

export async function invalidatePartnersCache(): Promise<void> {
  await bumpCacheVersion(PARTNERS_CACHE_NAMESPACE);
}

export async function revalidatePartners(): Promise<void> {
  await invalidatePartnersCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) revalidatePath(`/${loc}/partnyori`);
}
