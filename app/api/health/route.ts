import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

// Never cached — a health probe must reflect live state.
export const dynamic = "force-dynamic";

type ServiceStatus = "ok" | "err";

interface HealthPayload {
  db: ServiceStatus;
  redis: ServiceStatus;
  blob: ServiceStatus;
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
  if (!client) return "ok"; // Redis is optional; not configured is not a failure.
  try {
    const pong = await client.ping();
    return pong === "PONG" ? "ok" : "err";
  } catch {
    return "err";
  }
}

// Config-presence check only: a network round-trip to Vercel Blob would risk the
// <500ms budget and flap on transient errors. Missing token is the real failure
// mode (uploads break), so report that. Never throws.
function checkBlob(): ServiceStatus {
  return process.env.BLOB_READ_WRITE_TOKEN ? "ok" : "err";
}

export async function GET() {
  const [db, redis] = await Promise.all([checkDb(), checkRedis()]);
  const blob = checkBlob();

  const payload: HealthPayload = { db, redis, blob, ts: new Date().toISOString() };
  // Only the database is load-bearing for serving content; degrade (not 503) on
  // redis/blob issues so an external uptime monitor still sees the app as up.
  const status = db === "ok" ? 200 : 503;

  return NextResponse.json(payload, { status });
}
