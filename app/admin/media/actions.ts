"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { put, del } from "@vercel/blob";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { isMediaFolder, DEFAULT_FOLDER } from "@/lib/media/folders";
import { listMedia, type MediaItem } from "@/lib/media";
import { requirePermission } from "@/lib/auth/guard";

type UploadResult =
  | { ok: true; ids: string[] }
  | { ok: false; error: string };

type MetaResult = { ok: true } | { ok: false; errors: Record<string, string> };

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return `${base || "file"}${ext}`;
}

async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

/** Upload one or more files to a folder. Used by the dropzone + MediaPicker. */
export async function uploadMedia(folder: string, formData: FormData): Promise<UploadResult> {
  const userId = await requirePermission("media:edit");
  const targetFolder = isMediaFolder(folder) ? folder : DEFAULT_FOLDER;

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Не са избрани файлове за качване." };

  const ids: string[] = [];
  for (const file of files) {
    const filename = sanitizeFilename(file.name);
    const blobPath = `media/${targetFolder}/${Date.now()}-${filename}`;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { url, pathname } = await put(blobPath, buffer, {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });
      const record = await prisma.media.create({
        data: {
          url,
          pathname,
          filename,
          folder: targetFolder,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          authorId: userId,
        },
        select: { id: true },
      });
      ids.push(record.id);
    } catch (error) {
      console.error("media upload error", error);
      return { ok: false, error: "Качването на файл се провали. Опитайте отново." };
    }
  }

  await recordAudit({
    userId,
    action: "MEDIA_UPLOAD",
    entity: "Media",
    details: { folder: targetFolder, count: ids.length },
  });

  revalidatePath("/admin/media");
  return { ok: true, ids };
}

/** Fetch media for the on-demand MediaPicker modal (admin-only). */
export async function fetchMedia(folder?: string): Promise<MediaItem[]> {
  await requireUserId();
  return listMedia(folder);
}

const metaSchema = z.object({
  alt: z.string().max(300, "Алт-текстът е твърде дълъг (макс. 300 символа).").optional(),
  isMinorPhoto: z.boolean().optional(),
  consentRecorded: z.boolean().optional(),
});

/** Update alt text + minor-photo consent for one media row. */
export async function updateMediaMeta(
  id: string,
  input: { alt?: string; isMinorPhoto?: boolean; consentRecorded?: boolean }
): Promise<MetaResult> {
  const userId = await requirePermission("media:edit");
  const parsed = metaSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".") || "_form"] = issue.message;
    return { ok: false, errors };
  }

  const existing = await prisma.media.findUnique({
    where: { id },
    select: { isMinorPhoto: true, consentRecordedAt: true },
  });
  if (!existing) return { ok: false, errors: { _form: "Файлът не е намерен." } };

  const isMinorPhoto = parsed.data.isMinorPhoto ?? existing.isMinorPhoto;
  // Recording consent stamps now; clearing the minor flag clears consent.
  let consentRecordedAt = existing.consentRecordedAt;
  if (!isMinorPhoto) consentRecordedAt = null;
  else if (parsed.data.consentRecorded && !consentRecordedAt) consentRecordedAt = new Date();
  else if (parsed.data.consentRecorded === false) consentRecordedAt = null;

  await prisma.media.update({
    where: { id },
    data: {
      alt: parsed.data.alt?.trim() || null,
      isMinorPhoto,
      consentRecordedAt,
    },
  });

  await recordAudit({
    userId,
    action: "MEDIA_UPDATE",
    entity: "Media",
    entityId: id,
    details: { isMinorPhoto, consent: !!consentRecordedAt },
  });

  revalidatePath("/admin/media");
  return { ok: true };
}

/** Delete a media row and its Blob object. */
export async function deleteMedia(id: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await requirePermission("media:edit");
  const existing = await prisma.media.findUnique({ where: { id }, select: { url: true, pathname: true } });
  if (!existing) return { ok: false, error: "Файлът не е намерен." };

  try {
    await del(existing.url);
  } catch (error) {
    // Blob may already be gone; log but proceed to remove the row.
    console.error("media blob delete error", error);
  }

  await prisma.media.delete({ where: { id } });
  await recordAudit({ userId, action: "MEDIA_DELETE", entity: "Media", entityId: id });
  revalidatePath("/admin/media");
  return { ok: true };
}
