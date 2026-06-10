import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Force the memory-only path; the Redis tier degrades to a no-op when the
// client is unavailable, exactly like production without REDIS_URL.
vi.mock("@/lib/redis", () => ({
  getRedisClient: () => null,
}));

// lib/cache.ts holds module-level state (memory map, version hints), so each
// test gets a fresh copy via resetModules + dynamic import.
async function loadCache() {
  vi.resetModules();
  return import("@/lib/cache");
}

describe("getCached", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("cold miss calls the loader and returns its value", async () => {
    const { getCached } = await loadCache();
    const loader = vi.fn().mockResolvedValue(["a", "b"]);

    const result = await getCached("news:list:bg:pub", { ttlMs: 60_000, loader });

    expect(result).toEqual(["a", "b"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("warm hit within the TTL serves from memory without reloading", async () => {
    const { getCached } = await loadCache();
    const loader = vi.fn().mockResolvedValue([1, 2, 3]);

    await getCached("news:list:bg:pub", { ttlMs: 60_000, loader });
    vi.advanceTimersByTime(30_000);
    const second = await getCached("news:list:bg:pub", { ttlMs: 60_000, loader });

    expect(second).toEqual([1, 2, 3]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("expired entry reloads from the source", async () => {
    const { getCached } = await loadCache();
    const loader = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new");

    const first = await getCached("news:list:bg:pub", { ttlMs: 60_000, loader });
    vi.advanceTimersByTime(60_001);
    const second = await getCached("news:list:bg:pub", { ttlMs: 60_000, loader });

    expect(first).toBe("old");
    expect(second).toBe("new");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("bumpCacheVersion orphans entries in the bumped namespace only", async () => {
    const { getCached, bumpCacheVersion } = await loadCache();
    const newsLoader = vi.fn().mockResolvedValue("news");
    const navLoader = vi.fn().mockResolvedValue("nav");

    await getCached("news:list:bg:pub", { ttlMs: 60_000, loader: newsLoader });
    await getCached("nav:tree:bg", { ttlMs: 60_000, loader: navLoader });

    await bumpCacheVersion("news");

    await getCached("news:list:bg:pub", { ttlMs: 60_000, loader: newsLoader });
    await getCached("nav:tree:bg", { ttlMs: 60_000, loader: navLoader });

    expect(newsLoader).toHaveBeenCalledTimes(2); // reloaded after the bump
    expect(navLoader).toHaveBeenCalledTimes(1); // untouched namespace stays warm
  });

  it("invalidateCache drops matching prefix entries", async () => {
    const { getCached, invalidateCache } = await loadCache();
    const bgLoader = vi.fn().mockResolvedValue("bg");
    const enLoader = vi.fn().mockResolvedValue("en");

    await getCached("news:list:bg:pub", { ttlMs: 60_000, loader: bgLoader });
    await getCached("news:list:en:pub", { ttlMs: 60_000, loader: enLoader });

    await invalidateCache("news:list:bg");

    await getCached("news:list:bg:pub", { ttlMs: 60_000, loader: bgLoader });
    await getCached("news:list:en:pub", { ttlMs: 60_000, loader: enLoader });

    expect(bgLoader).toHaveBeenCalledTimes(2);
    expect(enLoader).toHaveBeenCalledTimes(1);
  });
});
