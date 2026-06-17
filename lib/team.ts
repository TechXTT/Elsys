import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";

// Public TeamMember reads (G2-2 type). Mirrors lib/news.ts caching contract.

const TEAM_CACHE_NAMESPACE = "team";
const LIST_TTL_MS = 60_000;

export interface TeamMemberView {
  id: string;
  name: string;
  role?: string;
  category?: string;
  email?: string;
  photo?: string;
}

const TEAM_SELECT = {
  id: true,
  name: true,
  role: true,
  category: true,
  email: true,
  photo: true,
} as const;

/** Published team members for a locale, ordered, cached. */
export async function getTeamMembers(locale?: Locale): Promise<TeamMemberView[]> {
  const loc = (locale ?? defaultLocale) as string;
  return getCached(`team:list:${loc}:pub`, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const rows = await prisma.teamMember.findMany({
        where: { locale: loc, ...publicWhere() },
        select: TEAM_SELECT,
        orderBy: [{ order: "asc" }, { name: "asc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        role: r.role ?? undefined,
        category: r.category ?? undefined,
        email: r.email ?? undefined,
        photo: r.photo ?? undefined,
      }));
    },
  });
}

export async function invalidateTeamCache(): Promise<void> {
  await bumpCacheVersion(TEAM_CACHE_NAMESPACE);
}

export async function revalidateTeam(): Promise<void> {
  await invalidateTeamCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) revalidatePath(`/${loc}/ekip`);
}
