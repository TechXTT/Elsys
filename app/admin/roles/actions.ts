"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { requirePermission, wouldRemoveLastAdmin, LAST_ADMIN_ERROR } from "@/lib/auth/guard";
import { ROLES, type AppRole } from "@/lib/auth/permissions";

// G5-1: assign a role to a user. Gated by `roles:manage` (ADMIN only per the
// matrix). Every change is written to the AuditLog (handover trail).
export async function setUserRole(userId: string, role: string): Promise<{ ok: boolean; error?: string }> {
  const actorId = await requirePermission("roles:manage");
  if (!ROLES.includes(role as AppRole)) return { ok: false, error: "Невалидна роля." };

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!existing) return { ok: false, error: "Потребителят не е намерен." };

  // Guardrail: do not let an admin strip their own ADMIN role (avoids lockout).
  if (actorId === userId && existing.role === "ADMIN" && role !== "ADMIN") {
    return { ok: false, error: "Не можете да премахнете собствената си администраторска роля." };
  }

  // Last-admin invariant: never demote the final remaining ADMIN.
  if (existing.role === "ADMIN" && role !== "ADMIN" && (await wouldRemoveLastAdmin(userId))) {
    await recordAudit({
      userId: actorId,
      action: "USER_ROLE_CHANGE_BLOCKED",
      entity: "User",
      entityId: userId,
      details: { reason: "last-admin", attemptedRole: role },
    });
    return { ok: false, error: LAST_ADMIN_ERROR };
  }

  await prisma.user.update({ where: { id: userId }, data: { role: role as AppRole } });
  await recordAudit({
    userId: actorId,
    action: "USER_ROLE_CHANGE",
    entity: "User",
    entityId: userId,
    details: { from: existing.role, to: role, email: existing.email },
  });

  revalidatePath("/admin/roles");
  return { ok: true };
}
