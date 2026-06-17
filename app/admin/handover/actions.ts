"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guard";
import { getHandoverState } from "@/lib/handover";

// G5-3: record the season handover completion. ADMIN-only (roles:manage), audited.
export async function completeHandover(
  successorId: string | null,
  note: string,
  summary: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await requirePermission("roles:manage");
  const state = await getHandoverState();
  await recordAudit({
    userId,
    action: "HANDOVER_COMPLETE",
    entity: "User",
    entityId: successorId ?? undefined,
    details: {
      season: state.season,
      doneCount: state.doneCount,
      total: state.steps.length,
      allTwoFactor: state.allTwoFactor,
      note: note?.slice(0, 1000) || null,
      summary: summary?.slice(0, 2000) || null,
    },
  });
  revalidatePath("/admin/handover");
  return { ok: true };
}
