import { prisma } from "./prisma";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { bumpCacheVersion, getCached } from "@/lib/cache";
import { publicWhere } from "@/lib/content/shared";
import type { ColorTag } from "@prisma/client";

// Public Document reads (G2-2 type). Mirrors lib/news.ts: memory→Redis→DB via
// lib/cache.ts, explicit select, publicWhere() gate.

const DOC_CACHE_NAMESPACE = "documents";
const LIST_TTL_MS = 60_000;

export interface DocItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: string;
  category?: string;
  color?: ColorTag;
}

const DOC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  fileUrl: true,
  fileType: true,
  fileSize: true,
  category: true,
  color: true,
} as const;

function toDocItem(row: {
  id: string; slug: string; title: string; description: string | null;
  fileUrl: string; fileType: string | null; fileSize: string | null;
  category: string | null; color: ColorTag;
}): DocItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    fileUrl: row.fileUrl,
    fileType: row.fileType ?? undefined,
    fileSize: row.fileSize ?? undefined,
    category: row.category ?? undefined,
    color: row.color,
  };
}

/** Published documents for a locale, ordered, cached. */
export async function getDocuments(locale?: Locale): Promise<DocItem[]> {
  const loc = (locale ?? defaultLocale) as string;
  return getCached(`documents:list:${loc}:pub`, {
    ttlMs: LIST_TTL_MS,
    loader: async () => {
      const rows = await prisma.document.findMany({
        where: { locale: loc, ...publicWhere() },
        select: DOC_SELECT,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      });
      return rows.map(toDocItem);
    },
  });
}

/** Orphans every cached document read; call from admin mutations before revalidate. */
export async function invalidateDocumentsCache(): Promise<void> {
  await bumpCacheVersion(DOC_CACHE_NAMESPACE);
}

export async function revalidateDocuments(): Promise<void> {
  await invalidateDocumentsCache();
  const { revalidatePath } = await import("next/cache");
  for (const loc of locales) revalidatePath(`/${loc}/dokumenti`);
}
