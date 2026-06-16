import { prisma } from "@/lib/prisma";

// Per-record successor notes (M5.2). Generic over (entity, entityId) so any
// content type can carry one without a per-model column. Never published.

export async function getSuccessorNote(entity: string, entityId: string): Promise<string | null> {
  const row = await prisma.successorNote.findUnique({
    where: { entity_entityId: { entity, entityId } },
    select: { note: true },
  });
  return row?.note ?? null;
}

/** Upsert (or clear) the note for a record. Empty/blank note deletes the row. */
export async function persistSuccessorNote(
  entity: string,
  entityId: string,
  note: string | null | undefined,
  updatedById?: string | null
): Promise<void> {
  const trimmed = note?.trim() ?? "";
  if (!trimmed) {
    await prisma.successorNote.deleteMany({ where: { entity, entityId } });
    return;
  }
  await prisma.successorNote.upsert({
    where: { entity_entityId: { entity, entityId } },
    create: { entity, entityId, note: trimmed, updatedById: updatedById ?? null },
    update: { note: trimmed, updatedById: updatedById ?? null },
  });
}
