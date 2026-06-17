// Role → permission matrix (G5-1 / PLAN M5.1). Client-safe pure data + `can()`.
// Server-side enforcement lives in lib/auth/guard.ts (requirePermission).
//
// SECURITY NOTE: this matrix is the source of truth for who can do what. Any
// change here widens/narrows access for every Server Action that gates on it —
// review with a human (see the security-review flag in docs/autonomous-progress.md).

export type AppRole = "USER" | "TEACHER" | "STUDENT_EDITOR" | "STUDENT_ADMIN" | "ADMIN";

export type Permission =
  | "news:edit"
  | "content:edit"
  | "media:edit"
  | "pages:edit"
  | "nav:edit"
  | "users:manage"
  | "roles:manage"
  | "settings:edit"
  | "audit:view";

export const PERMISSIONS: Permission[] = [
  "news:edit",
  "content:edit",
  "media:edit",
  "pages:edit",
  "nav:edit",
  "users:manage",
  "roles:manage",
  "settings:edit",
  "audit:view",
];

export const ROLES: AppRole[] = ["USER", "TEACHER", "STUDENT_EDITOR", "STUDENT_ADMIN", "ADMIN"];

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  // Legacy default — no admin capabilities.
  USER: [],
  // Teachers land in Simple Mode: edit news + pick media. No structural access.
  TEACHER: ["news:edit", "media:edit"],
  // Student editors handle day-to-day content + pages.
  STUDENT_EDITOR: ["news:edit", "content:edit", "media:edit", "pages:edit"],
  // Student admins run the site but cannot reassign roles (reserved for ADMIN).
  STUDENT_ADMIN: ["news:edit", "content:edit", "media:edit", "pages:edit", "nav:edit", "users:manage", "audit:view"],
  // Full access.
  ADMIN: [...PERMISSIONS],
};

export function can(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as AppRole];
  return !!perms && perms.includes(permission);
}

/** The editor mode a role should land in by default (G3-1: TEACHER → Simple). */
export function defaultEditorMode(role: string | null | undefined): "simple" | "advanced" {
  return role === "TEACHER" ? "simple" : "advanced";
}
