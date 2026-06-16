// Fixed, code-defined media folders (G2-1). Matches the ПАПКИ rail in Figma
// 89:2. These map to content areas rather than being free-form user folders —
// simpler to reason about and keeps blob pathnames predictable.
//
// Client-safe: no server-only imports. The labels are Bulgarian (admin default);
// the admin UI is bilingual via next-intl, but folder keys stay stable in the DB.

export const MEDIA_FOLDERS = [
  "general",
  "news",
  "galleries",
  "documents",
  "team",
  "partners",
] as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const DEFAULT_FOLDER: MediaFolder = "general";

export function isMediaFolder(value: unknown): value is MediaFolder {
  return typeof value === "string" && (MEDIA_FOLDERS as readonly string[]).includes(value);
}

/** i18n message key (Admin.media.folders.<key>) for a folder. */
export function folderLabelKey(folder: MediaFolder): string {
  return folder;
}
