import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/auth/api-guard";
import { prisma } from "@/lib/prisma";

// G5-3: export the audit log as a JSON download for the season archive.
export async function GET() {
  const __g = await apiGuard("audit:view"); if (__g instanceof NextResponse) return __g;
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: { action: true, entity: true, entityId: true, userId: true, details: true, createdAt: true },
  });
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), count: logs.length, logs }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
