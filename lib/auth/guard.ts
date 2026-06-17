import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can, type Permission } from "@/lib/auth/permissions";

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
