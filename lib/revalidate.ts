import { locales } from "@/i18n/config";

/**
 * On-demand ISR revalidation of every public page in every locale.
 *
 * Page and navigation mutations change content that renders on all pages
 * (nav tree, hierarchical paths), so the whole locale layout is revalidated
 * rather than guessing individual paths. Pages rebuild lazily on next visit.
 *
 * Call AFTER cache invalidation (nav tree / lib/cache.ts version bumps) so
 * rebuilt pages re-read the database instead of a stale cache entry.
 */
export async function revalidatePublicPages(): Promise<void> {
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) {
    revalidatePath(`/${loc}`, "layout");
  }
}
