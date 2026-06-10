import { getRedisClient, type RedisClient } from "@/lib/redis";

/**
 * Generic memory → Redis → DB cache helper with versioned invalidation.
 *
 * Pattern promoted from the navigation cache (lib/navigation-build.ts):
 * - In-memory Map for fast same-instance hits (TTL = ttlMs)
 * - Redis for cross-instance hits (TTL = ttlMs × REDIS_TTL_MULTIPLIER)
 * - A per-namespace version key; bumping it orphans every existing entry
 *
 * Keys are namespaced by their first `:`-separated segment, e.g. the key
 * "news:list:bg:pub" lives in the "news" namespace and is stored under the
 * physical key "cache:{version}:news:list:bg:pub".
 *
 * Redis being unavailable is never an error — every Redis operation degrades
 * to the memory tier (same behavior as the navigation cache).
 */

export interface GetCachedOptions<T> {
  /** Memory TTL in milliseconds. Redis entries live REDIS_TTL_MULTIPLIER× longer. */
  ttlMs: number;
  /** Explicit version override; defaults to the namespace's current version. */
  version?: string;
  /** Source-of-truth loader (usually a Prisma query) invoked on cache miss. */
  loader: () => Promise<T>;
}

interface MemoryEntry {
  value: unknown;
  expires: number;
}

const CACHE_PREFIX = "cache";
const REDIS_TTL_MULTIPLIER = 5; // mirrors nav cache: 60s memory / 300s Redis

const MEMORY_CACHE = new Map<string, MemoryEntry>();
// Last known version per namespace; authoritative copy lives in Redis.
const VERSION_HINTS = new Map<string, string>();

function logInfo(message: string) {
  console.info(`[cache] ${message}`);
}

function newVersion(): string {
  return `v${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function namespaceOf(key: string): string {
  const idx = key.indexOf(":");
  return idx === -1 ? key : key.slice(0, idx);
}

function versionKeyFor(namespace: string): string {
  return `${CACHE_PREFIX}:${namespace}:version`;
}

function physicalKey(key: string, version: string): string {
  return `${CACHE_PREFIX}:${version}:${key}`;
}

/** Logical key of a physical key: "cache:{version}:{logical}" → "{logical}". */
function logicalKeyOf(pkey: string): string {
  return pkey.split(":").slice(2).join(":");
}

async function redisSafe<T>(op: (redis: RedisClient) => Promise<T>): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    return await op(redis);
  } catch (error) {
    console.error("[cache] redis unavailable, falling back to memory", error);
    return null;
  }
}

async function getVersion(namespace: string): Promise<string> {
  let hint = VERSION_HINTS.get(namespace);
  if (!hint) {
    hint = newVersion();
    VERSION_HINTS.set(namespace, hint);
  }
  const remote = await redisSafe((redis) => redis.get(versionKeyFor(namespace)));
  if (remote) {
    VERSION_HINTS.set(namespace, remote);
    return remote;
  }
  await redisSafe((redis) => redis.set(versionKeyFor(namespace), hint!));
  return hint;
}

export async function getCached<T>(key: string, opts: GetCachedOptions<T>): Promise<T> {
  const version = opts.version ?? (await getVersion(namespaceOf(key)));
  const pkey = physicalKey(key, version);

  const memory = MEMORY_CACHE.get(pkey);
  if (memory && memory.expires > Date.now()) {
    logInfo(`hit (memory) ${key}`);
    return memory.value as T;
  }
  if (memory) MEMORY_CACHE.delete(pkey);

  const raw = await redisSafe((redis) => redis.get(pkey));
  if (raw) {
    try {
      const value = JSON.parse(raw) as T;
      MEMORY_CACHE.set(pkey, { value, expires: Date.now() + opts.ttlMs });
      logInfo(`hit (redis) ${key}`);
      return value;
    } catch {
      // Corrupted entry — fall through to the loader.
    }
  }

  logInfo(`miss ${key} — loading from source`);
  const value = await opts.loader();
  MEMORY_CACHE.set(pkey, { value, expires: Date.now() + opts.ttlMs });
  const redisTtlSeconds = Math.max(1, Math.ceil((opts.ttlMs * REDIS_TTL_MULTIPLIER) / 1000));
  await redisSafe((redis) => redis.set(pkey, JSON.stringify(value), "EX", redisTtlSeconds));
  return value;
}

/**
 * Drop every entry whose logical key equals or starts with `keyOrPrefix`,
 * in memory and in Redis, under the namespace's current version.
 */
export async function invalidateCache(keyOrPrefix: string): Promise<void> {
  const version = await getVersion(namespaceOf(keyOrPrefix));
  for (const pkey of Array.from(MEMORY_CACHE.keys())) {
    if (logicalKeyOf(pkey).startsWith(keyOrPrefix)) MEMORY_CACHE.delete(pkey);
  }
  await redisSafe(async (redis) => {
    const pattern = `${physicalKey(keyOrPrefix, version)}*`;
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== "0");
  });
  logInfo(`invalidated ${keyOrPrefix}`);
}

/**
 * Bump the namespace's version, orphaning every existing entry across all
 * instances. Orphaned Redis entries expire via their TTL.
 */
export async function bumpCacheVersion(namespace: string): Promise<string> {
  const version = newVersion();
  VERSION_HINTS.set(namespace, version);
  for (const pkey of Array.from(MEMORY_CACHE.keys())) {
    if (namespaceOf(logicalKeyOf(pkey)) === namespace) MEMORY_CACHE.delete(pkey);
  }
  await redisSafe((redis) => redis.set(versionKeyFor(namespace), version));
  logInfo(`version bump ${namespace} → ${version}`);
  return version;
}
