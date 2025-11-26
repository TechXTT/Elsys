interface NavCacheEntry {
  items: any[];
  legacy: boolean;
  expires: number;
}

const NAV_CACHE = new Map<string, NavCacheEntry>();
const NAV_TTL_MS = 60_000;

export function getCachedNavigation(locale: string): { items: any[]; legacy: boolean } | null {
  const cached = NAV_CACHE.get(locale);
  if (!cached) return null;
  if (Date.now() >= cached.expires) {
    NAV_CACHE.delete(locale);
    return null;
  }
  return { items: cached.items, legacy: cached.legacy };
}

export function storeNavigationCache(locale: string, payload: { items: any[]; legacy: boolean }): void {
  NAV_CACHE.set(locale, { ...payload, expires: Date.now() + NAV_TTL_MS });
}

export function invalidateNavigationCache(locale?: string): void {
  if (locale) {
    NAV_CACHE.delete(locale);
  } else {
    NAV_CACHE.clear();
  }
}

export const navigationCacheTtlMs = NAV_TTL_MS;
