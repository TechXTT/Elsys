"use server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { getContentType } from "./registry";
import { formatZodErrors } from "@/lib/content/validation";
import { persistSuccessorNote } from "@/lib/content/successor-notes";
import { revalidatePublicForType } from "./revalidate";
import { requirePermission } from "@/lib/auth/guard";
import type { FieldConfig, PublishStatus } from "@/lib/content/shared";

const SUCCESSOR_NOTE_FIELD = "__successorNote";

type ActionResult<T = string> =
  | { ok: true; id: T }
  | { ok: false; errors: Record<string, string> };

function getPrismaModel(modelName: string) {
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  return (prisma as Record<string, any>)[key];
}

function parseFormField(field: FieldConfig, formData: FormData): unknown {
  if (field.type === "boolean") return formData.get(field.name) === "on";
  if (field.type === "number") {
    const v = formData.get(field.name);
    return v !== null && v !== "" ? Number(v) : undefined;
  }
  const v = formData.get(field.name);
  return v !== null ? String(v) : undefined;
}

function buildRaw(fields: FieldConfig[], formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const field of fields) {
    if (!field.hidden) raw[field.name] = parseFormField(field, formData);
  }
  return raw;
}

export async function createContentRecord(
  type: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  await requirePermission("content:edit");

  const config = getContentType(type);
  if (!config) throw new Error(`Unknown content type: ${type}`);

  const parsed = config.schema.safeParse(buildRaw(config.fields, formData));
  if (!parsed.success) {
    return { ok: false, errors: formatZodErrors(parsed.error) };
  }

  const model = getPrismaModel(config.modelName);
  const record = await model.create({ data: parsed.data });

  const userId = (session.user as { id?: string }).id;
  if (config.enableSuccessorNote !== false) {
    await persistSuccessorNote(
      config.modelName,
      record.id as string,
      formData.get(SUCCESSOR_NOTE_FIELD)?.toString(),
      userId
    );
  }

  await recordAudit({
    userId,
    action: `${type.toUpperCase()}_CREATE`,
    entity: config.modelName,
    entityId: record.id as string,
  });

  await revalidatePublicForType(type);
  revalidatePath(`/admin/content/${type}`);
  return { ok: true, id: record.id as string };
}

export async function updateContentRecord(
  type: string,
  id: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  await requirePermission("content:edit");

  const config = getContentType(type);
  if (!config) throw new Error(`Unknown content type: ${type}`);

  const parsed = config.schema.safeParse(buildRaw(config.fields, formData));
  if (!parsed.success) {
    return { ok: false, errors: formatZodErrors(parsed.error) };
  }

  const model = getPrismaModel(config.modelName);
  await model.update({ where: { id }, data: parsed.data });

  const userId = (session.user as { id?: string }).id;
  if (config.enableSuccessorNote !== false) {
    await persistSuccessorNote(
      config.modelName,
      id,
      formData.get(SUCCESSOR_NOTE_FIELD)?.toString(),
      userId
    );
  }

  await recordAudit({
    userId,
    action: `${type.toUpperCase()}_UPDATE`,
    entity: config.modelName,
    entityId: id,
    details: { fields: Object.keys(parsed.data as object) },
  });

  await revalidatePublicForType(type);
  revalidatePath(`/admin/content/${type}`);
  revalidatePath(`/admin/content/${type}/${id}`);
  return { ok: true, id };
}

export async function deleteContentRecord(
  type: string,
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  await requirePermission("content:edit");

  const config = getContentType(type);
  if (!config) throw new Error(`Unknown content type: ${type}`);

  const model = getPrismaModel(config.modelName);
  await model.delete({ where: { id } });

  await recordAudit({
    userId: (session.user as { id?: string }).id,
    action: `${type.toUpperCase()}_DELETE`,
    entity: config.modelName,
    entityId: id,
  });

  await revalidatePublicForType(type);
  revalidatePath(`/admin/content/${type}`);
  return { ok: true };
}

type BulkResult = { ok: boolean; count?: number; error?: string };

/** Bulk-set the publish status of many records (publish / archive). */
export async function bulkSetStatus(
  type: string,
  ids: string[],
  status: PublishStatus
): Promise<BulkResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  await requirePermission("content:edit");
  const config = getContentType(type);
  if (!config) throw new Error(`Unknown content type: ${type}`);
  if (ids.length === 0) return { ok: true, count: 0 };

  const statusField = config.statusField ?? "status";
  const model = getPrismaModel(config.modelName);
  const res = await model.updateMany({
    where: { id: { in: ids } },
    data: { [statusField]: status },
  });

  await recordAudit({
    userId: (session.user as { id?: string }).id,
    action: `${type.toUpperCase()}_BULK_STATUS`,
    entity: config.modelName,
    details: { ids, status, count: res.count },
  });

  await revalidatePublicForType(type);
  revalidatePath(`/admin/content/${type}`);
  return { ok: true, count: res.count };
}

/** Bulk-delete many records (and their successor notes). */
export async function bulkDeleteRecords(type: string, ids: string[]): Promise<BulkResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  await requirePermission("content:edit");
  const config = getContentType(type);
  if (!config) throw new Error(`Unknown content type: ${type}`);
  if (ids.length === 0) return { ok: true, count: 0 };

  const model = getPrismaModel(config.modelName);
  const res = await model.deleteMany({ where: { id: { in: ids } } });
  await prisma.successorNote.deleteMany({
    where: { entity: config.modelName, entityId: { in: ids } },
  });

  await recordAudit({
    userId: (session.user as { id?: string }).id,
    action: `${type.toUpperCase()}_BULK_DELETE`,
    entity: config.modelName,
    details: { ids, count: res.count },
  });

  await revalidatePublicForType(type);
  revalidatePath(`/admin/content/${type}`);
  return { ok: true, count: res.count };
}
