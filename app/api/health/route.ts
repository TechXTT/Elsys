import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

export const dynamic = "force-dynamic";

type ServiceStatus = "ok" | "err";
interface HealthPayload {
  db: ServiceStatus;
  redis: ServiceStatus;
  ts: string;
}

async function checkDb(): Promise<ServiceStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "err";
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const client = getRedisClient();
  if (!client) return "ok"; // Redis is optional; not configured = not a failure
  try {
    const pong = await client.ping();
    return pong === "PONG" ? "ok" : "err";
  } catch {
    return "err";
  }
}

export async function GET() {
  const [db, redis] = await Promise.all([checkDb(), checkRedis()]);

  const payload: HealthPayload = { db, redis, ts: new Date().toISOString() };
  const status = db === "ok" ? 200 : 503;

  return NextResponse.json(payload, { status });
}
