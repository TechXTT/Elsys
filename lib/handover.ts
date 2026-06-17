import { prisma } from "@/lib/prisma";

// Succession handover state (G5-3, Figma 108:2). Derives each checklist step
// from real DB state so the season handover reflects what's actually done.

export interface HandoverStep {
  key: string;
  done: boolean;
  /** True when the step is an action the admin performs elsewhere (not auto-derivable). */
  manual: boolean;
  count?: number;
  href?: string;
}

export interface HandoverState {
  season: string;
  steps: HandoverStep[];
  doneCount: number;
  allTwoFactor: boolean;
  successors: { id: string; name: string | null; email: string | null; role: string }[];
}

export async function getHandoverState(): Promise<HandoverState> {
  const year = new Date().getFullYear();
  const season = `${year} → ${year + 1}`;

  const adminCapable = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STUDENT_ADMIN"] } },
    select: { id: true, name: true, email: true, role: true, twoFactorEnabled: true },
  });
  const hasSuccessor = adminCapable.length >= 2;
  const hasStudentAdmin = adminCapable.some((u) => u.role === "STUDENT_ADMIN");
  const allTwoFactor = adminCapable.every((u) => u.twoFactorEnabled);
  const notesCount = await prisma.successorNote.count();
  const completedBefore = await prisma.auditLog.count({ where: { action: "HANDOVER_COMPLETE" } });

  const steps: HandoverStep[] = [
    { key: "addAdmin", done: hasSuccessor, manual: true, count: adminCapable.length, href: "/admin/users" },
    { key: "assignRole", done: hasStudentAdmin || adminCapable.length >= 2, manual: true, href: "/admin/roles" },
    { key: "enforce2fa", done: allTwoFactor, manual: true, href: "/admin/security" },
    { key: "reviewNotes", done: notesCount === 0, manual: true, count: notesCount, href: "/admin/content/club" },
    { key: "exportAudit", done: false, manual: true, href: "/api/admin/audit/export" },
    { key: "deactivateLeavers", done: false, manual: true, href: "/admin/users" },
    { key: "seasonSummary", done: completedBefore > 0, manual: true },
  ];

  return {
    season,
    steps,
    doneCount: steps.filter((s) => s.done).length,
    allTwoFactor,
    successors: adminCapable.map(({ twoFactorEnabled, ...u }) => u),
  };
}
