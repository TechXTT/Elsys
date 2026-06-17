"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Editor server-side drafts (G3-2). Scoped to the signed-in user + an editor key
// (e.g. "news:simple:new"). Autosaved ~30s; restored on mount; cleared on save.

async function uid(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

export async function saveDraft(key: string, data: Record<string, unknown>): Promise<{ ok: true }> {
  const userId = await uid();
  await prisma.draft.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, data: data as object },
    update: { data: data as object },
  });
  return { ok: true };
}

export async function loadDraft(
  key: string
): Promise<{ data: Record<string, unknown>; updatedAt: string } | null> {
  const userId = await uid();
  const row = await prisma.draft.findUnique({
    where: { userId_key: { userId, key } },
    select: { data: true, updatedAt: true },
  });
  if (!row) return null;
  return { data: row.data as Record<string, unknown>, updatedAt: row.updatedAt.toISOString() };
}

export async function clearDraft(key: string): Promise<{ ok: true }> {
  const userId = await uid();
  await prisma.draft.deleteMany({ where: { userId, key } });
  return { ok: true };
}
