import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";
import type { ColorTag } from "@prisma/client";

// Public Club reads (G2-2 type). Mirrors lib/news.ts caching contract.

const CLUBS_CACHE_NAMESPACE = "clubs";
const LIST_TTL_MS = 60_000;

export interface ClubView {
  id: string;
  slug: string;
  title: string;
  description?: string;
  color: ColorTag;
  coverImage?: string;
  meetingSchedule?: string;
  contactEmail?: string;
}

const CLUB_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  color: true,
  coverImage: true,
  meetingSchedule: true,
  contactEmail: true,
} as const;

/** Published clubs for a locale, ordered, cached. */
export async function getClubs(locale?: Locale): Promise<ClubView[]> {
  const loc = (locale ?? defaultLocale) as string;
  return getCached(`clubs:list:${loc}:pub`, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const rows = await prisma.club.findMany({
        where: { locale: loc, ...publicWhere() },
        select: CLUB_SELECT,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        description: r.description ?? undefined,
        color: r.color,
        coverImage: r.coverImage ?? undefined,
        meetingSchedule: r.meetingSchedule ?? undefined,
        contactEmail: r.contactEmail ?? undefined,
      }));
    },
  });
}

export async function invalidateClubsCache(): Promise<void> {
  await bumpCacheVersion(CLUBS_CACHE_NAMESPACE);
}

export async function revalidateClubs(): Promise<void> {
  await invalidateClubsCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) revalidatePath(`/${loc}/klubove`);
}
