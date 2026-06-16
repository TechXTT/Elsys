import { prisma } from "@/lib/prisma";
import { isMediaFolder, MEDIA_FOLDERS, type MediaFolder } from "@/lib/media/folders";

// Media Library reads (G2-1). Admin-only surface, but every read uses an
// explicit `select` (working-agreement #4 hygiene) and never returns more than
// the grid/picker needs.

export interface MediaItem {
  id: string;
  url: string;
  pathname: string;
  filename: string;
  alt: string | null;
  folder: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  isMinorPhoto: boolean;
  consentRecordedAt: Date | null;
  createdAt: Date;
}

const MEDIA_SELECT = {
  id: true,
  url: true,
  pathname: true,
  filename: true,
  alt: true,
  folder: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  isMinorPhoto: true,
  consentRecordedAt: true,
  createdAt: true,
} as const;

/** All media, optionally scoped to one folder, newest first. */
export async function listMedia(folder?: string): Promise<MediaItem[]> {
  const where = folder && isMediaFolder(folder) ? { folder } : undefined;
  return prisma.media.findMany({
    where,
    select: MEDIA_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

/** Per-folder counts for the folder rail (includes an "all" total). */
export async function getFolderCounts(): Promise<Record<string, number>> {
  const grouped = await prisma.media.groupBy({
    by: ["folder"],
    _count: { _all: true },
  });
  const counts: Record<string, number> = { all: 0 };
  for (const f of MEDIA_FOLDERS) counts[f] = 0;
  for (const row of grouped) {
    counts[row.folder] = row._count._all;
    counts.all += row._count._all;
  }
  return counts;
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  return prisma.media.findUnique({ where: { id }, select: MEDIA_SELECT });
}

/** True when a row needs attention before public use (a11y / GDPR). */
export function mediaNeedsAttention(m: Pick<MediaItem, "alt" | "isMinorPhoto" | "consentRecordedAt">): boolean {
  if (!m.alt || !m.alt.trim()) return true;
  if (m.isMinorPhoto && !m.consentRecordedAt) return true;
  return false;
}

export type { MediaFolder };
