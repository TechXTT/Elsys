import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";

// Public Leader (alumni) reads (G2-2 type, D-10). Yearly-append list.

const LEADERS_CACHE_NAMESPACE = "leaders";
const LIST_TTL_MS = 60_000;

export interface LeaderView {
  id: string;
  name: string;
  role?: string;
  description?: string;
  image?: string;
  year: number;
}

/** Published leaders for a locale, newest graduation year first, cached. */
export async function getLeaders(locale?: Locale): Promise<LeaderView[]> {
  const loc = (locale ?? defaultLocale) as string;
  return getCached(`leaders:list:${loc}:pub`, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const rows = await prisma.leader.findMany({
        where: { locale: loc, ...publicWhere() },
        select: { id: true, name: true, role: true, description: true, image: true, year: true },
        orderBy: [{ year: "desc" }, { order: "asc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role ?? undefined,
        description: r.description ?? undefined,
        image: r.image ?? undefined,
        year: r.year,
      }));
    },
  });
}

export async function invalidateLeadersCache(): Promise<void> {
  await bumpCacheVersion(LEADERS_CACHE_NAMESPACE);
}

export async function revalidateLeaders(): Promise<void> {
  await invalidateLeadersCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) revalidatePath(`/${loc}/vipuski`);
}
