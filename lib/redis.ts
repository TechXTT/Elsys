import Redis from "ioredis";

export type RedisClient = Redis;

declare global {
  // eslint-disable-next-line no-var
  var __elsysRedis__: RedisClient | null | undefined;
}

const redisUrl = process.env.REDIS_URL;

let cachedClient: RedisClient | null | undefined = undefined;

function initRedis(): RedisClient | null {
  if (!redisUrl) return null;
  if (cachedClient) return cachedClient;
  if (globalThis.__elsysRedis__) {
    cachedClient = globalThis.__elsysRedis__;
    return cachedClient;
  }
  const client = new Redis(redisUrl, { lazyConnect: true, enableAutoPipelining: true });
  cachedClient = client;
  globalThis.__elsysRedis__ = client;
  return client;
}

export function getRedisClient(): RedisClient | null {
  return initRedis();
}
