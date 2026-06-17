/* eslint-disable no-console */
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";
import { fetchBinary } from "./lib/http";

// Media pipeline (G4 / M4.1). Download a referenced legacy image, dedupe by
// content hash, upload to Vercel Blob, and create a Media row. Carries legacy
// alt (flags missing); consent is NEVER auto-asserted (consentRecordedAt stays
// null, isMinorPhoto false) — every imported image is flagged for human review.

export interface MediaImportResult {
  url: string;
  mediaId: string;
  missingAlt: boolean;
  reused: boolean;
}

const EXT_RE = /\.([a-z0-9]{2,5})(?:\?.*)?$/i;

export async function importImage(
  prisma: PrismaClient,
  src: string,
  alt: string,
  folder: string,
  authorId: string | null,
  opts: { dryRun?: boolean } = {}
): Promise<MediaImportResult | null> {
  if (opts.dryRun) {
    return { url: src, mediaId: "(dry-run)", missingAlt: !alt?.trim(), reused: false };
  }
  const bin = await fetchBinary(src);
  if (!bin) return null;
  const hash = createHash("sha256").update(bin.buffer).digest("hex").slice(0, 16);
  const ext = (src.match(EXT_RE)?.[1] ?? bin.contentType.split("/")[1] ?? "bin").toLowerCase();
  const pathname = `media/import/${hash}.${ext}`;

  // Dedupe across runs: a Media row with this hash-based pathname already exists.
  const existing = await prisma.media.findFirst({ where: { pathname }, select: { id: true, url: true } });
  if (existing) return { url: existing.url, mediaId: existing.id, missingAlt: !alt?.trim(), reused: true };

  const { url } = await put(pathname, bin.buffer, { access: "public", contentType: bin.contentType, addRandomSuffix: false });
  const filename = src.split("/").pop()?.split("?")[0] ?? `${hash}.${ext}`;
  const row = await prisma.media.create({
    data: {
      url,
      pathname,
      filename,
      folder,
      mimeType: bin.contentType,
      size: bin.buffer.length,
      alt: alt?.trim() || null,
      isMinorPhoto: false, // consent is a legal judgment — never auto-asserted
      consentRecordedAt: null,
      authorId,
    },
    select: { id: true },
  });
  return { url, mediaId: row.id, missingAlt: !alt?.trim(), reused: false };
}
