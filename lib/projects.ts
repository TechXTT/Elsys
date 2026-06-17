import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";

// Public Project reads (G2-2 type). Mirrors lib/news.ts caching contract.

const PROJECTS_CACHE_NAMESPACE = "projects";
const LIST_TTL_MS = 60_000;

export interface ProjectView {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  url?: string;
  category?: string;
}

const PROJECT_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  image: true,
  url: true,
  category: true,
} as const;

/** Published projects for a locale, ordered, cached. */
export async function getProjects(locale?: Locale): Promise<ProjectView[]> {
  const loc = (locale ?? defaultLocale) as string;
  return getCached(`projects:list:${loc}:pub`, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const rows = await prisma.project.findMany({
        where: { locale: loc, ...publicWhere() },
        select: PROJECT_SELECT,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        description: r.description ?? undefined,
        image: r.image ?? undefined,
        url: r.url ?? undefined,
        category: r.category ?? undefined,
      }));
    },
  });
}

export async function invalidateProjectsCache(): Promise<void> {
  await bumpCacheVersion(PROJECTS_CACHE_NAMESPACE);
}

export async function revalidateProjects(): Promise<void> {
  await invalidateProjectsCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) revalidatePath(`/${loc}/evroproekti`);
}
