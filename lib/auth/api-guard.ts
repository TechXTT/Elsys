import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can, type Permission } from "@/lib/auth/permissions";

// Permission guard for the deprecated app/api/admin/** route handlers (G5-sec).
// Mirrors the Server-Action matrix so no admin endpoint is left ungated. Returns
// the actor on success, or a 401/403 NextResponse the handler must return as-is.

export interface ApiActor {
  userId: string;
  role: string;
}

/**
 * `apiGuard()` → authenticated only (any signed-in user).
 * `apiGuard(permission)` → authenticated AND the role grants `permission`.
 * Routes that don't map to a permission pass `"roles:manage"` (ADMIN-only).
 */
export async function apiGuard(permission?: Permission): Promise<ApiActor | NextResponse> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  if (permission && !can(user.role, permission)) {
    return NextResponse.json({ error: "Нямате права за това действие." }, { status: 403 });
  }
  return { userId: user.id, role: user.role ?? "USER" };
}
