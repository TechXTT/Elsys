import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, type Permission } from "@/lib/auth/permissions";

/**
 * "Last admin" invariant (G5-sec): true when removing/demoting/disabling
 * `userId` would leave the system with zero ADMINs. Callers must block the op
 * with a friendly Bulgarian error + AuditLog the attempt.
 */
export async function wouldRemoveLastAdmin(userId: string): Promise<boolean> {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (target?.role !== "ADMIN") return false;
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  return adminCount <= 1;
}

export const LAST_ADMIN_ERROR = "Това е последният администратор — не може да бъде понижен, премахнат или деактивиран.";

// Server-side permission enforcement (G5-1). Call from Server Actions.

export async function currentSession() {
  return getServerSession(authOptions);
}

export async function currentRole(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return ((session?.user as { role?: string } | undefined)?.role) ?? null;
}

/** Throws if there is no signed-in user; returns the user id. */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}

/**
 * Throws unless the signed-in user's role grants `permission`. Returns the
 * user id on success so actions can attribute the audit entry.
 */
export async function requirePermission(permission: Permission): Promise<string> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) throw new Error("Unauthorized");
  if (!can(user.role, permission)) throw new Error(`Forbidden: missing permission ${permission}`);
  return user.id;
}
