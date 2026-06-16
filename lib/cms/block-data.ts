import type { Locale } from "@/i18n/config";
import type { BlockContext, DataNeed } from "@/lib/blocks/registry";
import { getNewsPosts } from "@/lib/news";
import { getDocuments } from "@/lib/documents";
import { getClubs } from "@/lib/clubs";
import { getTeamMembers } from "@/lib/team";
import { getPartners } from "@/lib/partners";
import { getCarouselSlides } from "@/lib/carousel";

/**
 * R4: load every public data source a page's blocks declared via `needs`, in one
 * Promise.all, through the cached lib readers (memory→Redis→DB). Returns a
 * partial BlockContext to merge into the render context.
 */
export async function loadBlockData(
  needs: DataNeed[],
  locale: Locale,
  includeDrafts = false
): Promise<Partial<BlockContext>> {
  const set = new Set(needs);
  const [news, documents, clubs, team, partners, carouselSlides] = await Promise.all([
    set.has("news") ? getNewsPosts(locale, includeDrafts) : Promise.resolve(undefined),
    set.has("documents") ? getDocuments(locale) : Promise.resolve(undefined),
    set.has("clubs") ? getClubs(locale) : Promise.resolve(undefined),
    set.has("team") ? getTeamMembers(locale) : Promise.resolve(undefined),
    set.has("partners") ? getPartners(locale) : Promise.resolve(undefined),
    set.has("carousel") ? getCarouselSlides(locale) : Promise.resolve(undefined),
  ]);
  return { news, documents, clubs, team, partners, carouselSlides };
}
