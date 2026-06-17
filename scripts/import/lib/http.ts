import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// Polite, cached, throttled HTTP for the migration crawler (G4 / PLAN M4).
// Read-only against the live site. Every fetched page is cached to
// scripts/import/.cache/ (gitignored) so re-runs never re-hit the origin.

export const ORIGIN = "https://elsys-bg.org";
const UA = "ELSYS-CMS-migration-bot/1.0 (read-only content migration; respects robots.txt)";
const CACHE_DIR = path.join(process.cwd(), "scripts/import/.cache");
const MIN_INTERVAL_MS = 1000; // ≤ 1 req/s

// robots.txt: only /admin/ is disallowed (see LEGACY-MAP.md). Encoded statically
// so the crawler needs no extra round-trip; refresh if the live file changes.
const DISALLOWED = ["/admin/"];

export function isAllowed(urlPath: string): boolean {
  return !DISALLOWED.some((d) => urlPath.startsWith(d));
}

function cachePathFor(url: string): string {
  const hash = createHash("sha1").update(url).digest("hex");
  return path.join(CACHE_DIR, `${hash}.html`);
}

let lastFetch = 0;
async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastFetch);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();
}

export interface FetchResult {
  url: string;
  html: string;
  fromCache: boolean;
}

/**
 * Fetch a page, preferring the on-disk cache. With `cacheOnly`, never hits the
 * network (used by --dry-run so a dry run does no live traffic). Returns null on
 * a disallowed path, a cache miss in cacheOnly mode, or a non-OK response.
 */
export async function fetchPage(
  url: string,
  opts: { cacheOnly?: boolean } = {}
): Promise<FetchResult | null> {
  const u = new URL(url, ORIGIN);
  if (u.origin !== ORIGIN || !isAllowed(u.pathname)) return null;
  const full = u.toString();
  const cacheFile = cachePathFor(full);

  if (existsSync(cacheFile)) {
    return { url: full, html: await readFile(cacheFile, "utf8"), fromCache: true };
  }
  if (opts.cacheOnly) return null;

  await throttle();
  let res: Response;
  try {
    res = await fetch(full, { headers: { "User-Agent": UA, Accept: "text/html" } });
  } catch (e) {
    console.warn(`  fetch error ${full}: ${(e as Error).message}`);
    return null;
  }
  if (!res.ok) {
    console.warn(`  ${res.status} ${full}`);
    return null;
  }
  const html = await res.text();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(cacheFile, html, "utf8");
  return { url: full, html, fromCache: false };
}

/** Download a binary asset (for the media pipeline), throttled. */
export async function fetchBinary(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const u = new URL(url, ORIGIN);
  if (!isAllowed(u.pathname)) return null;
  await throttle();
  try {
    const res = await fetch(u.toString(), { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType: res.headers.get("content-type") ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

/** Tiny concurrency limiter (avoids a p-limit dependency). */
export function pLimit(concurrency: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => { active--; queue.shift()?.(); };
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) await new Promise<void>((res) => queue.push(res));
    active++;
    try { return await fn(); } finally { next(); }
  };
}
