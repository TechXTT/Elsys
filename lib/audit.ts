import { prisma } from "./prisma";

function getClientIp(headers: Headers): string | undefined {
  const xff = headers.get("x-forwarded-for") || headers.get("x-real-ip");
  if (!xff) return undefined;
  // x-forwarded-for can be a comma-separated list; take the first
  return xff.split(",")[0]?.trim();
}

export async function recordAudit(params: {
  req?: Request | null;
  userId?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: unknown;
}): Promise<void> {
  try {
    const ip = params.req ? getClientIp(params.req.headers) : undefined;
    const userAgent = params.req?.headers.get("user-agent") ?? undefined;
    await (prisma as any).auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        action: params.action,
        entity: params.entity ?? undefined,
        entityId: params.entityId ?? undefined,
        details: params.details as any,
        ip,
        userAgent,
      } as any,
    });
  } catch (err) {
    // Do not block main flow if audit fails; log to server console only
    console.error("audit log error", err);
  }
}
