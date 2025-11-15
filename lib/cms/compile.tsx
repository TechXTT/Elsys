import React from "react";
import { prisma } from "@/lib/prisma";
import { validateBlocks, renderBlockInstance, type BlockInstance } from "@/lib/blocks/registry";
import { getNewsPosts } from "@/lib/news";
import type { Locale } from "@/i18n/config";

interface CompileOptions {
  slug: string;
  locale: Locale;
  includeDrafts?: boolean;
  withData?: boolean; // fetch related async data (news, nav)
}

interface CompiledPage {
  title: string;
  excerpt?: string;
  version?: number;
  published: boolean;
  blocks: BlockInstance[];
  element: React.ReactNode; // pre-rendered block tree (no markdown body fallback yet)
}

// Simple in-memory cache (per process). Could be replaced with better store later.
const cache = new Map<string, { at: number; value: CompiledPage }>();
const TTL_MS = 60_000; // 1 minute initial TTL (tweak later)

function cacheKey(o: CompileOptions & { version?: number; published: boolean }) {
  return `page:${o.locale}:${o.slug}:v${o.version ?? 0}:p${o.published}`;
}

function requiresNews(blocks: BlockInstance[]): boolean {
  return blocks.some((b) => b.type === "NewsList");
}

export async function compilePage(opts: CompileOptions): Promise<CompiledPage | null> {
  const { slug, locale, includeDrafts, withData = true } = opts;
  // Attempt cache
  const baseKeyPrefix = `page:${locale}:${slug}`;
  for (const [key, entry] of cache) {
    if (key.startsWith(baseKeyPrefix) && Date.now() - entry.at < TTL_MS) {
      return entry.value;
    }
  }

  // Load page + current version
  const page: any = await (prisma as any).page.findFirst({
    where: { slug, locale },
    include: { currentVersion: true },
  });
  if (!page) return null;

  // Determine source fields (prefer currentVersion snapshot if present)
  const source = page.currentVersion ?? page;
  const published = !!(page.currentVersion ? page.currentVersion.published : page.published);
  if (!includeDrafts && !published) return null; // hide drafts if not requested

  // Validate blocks
  const rawBlocks = source.blocks ?? [];
  const validation = validateBlocks(rawBlocks);
  const normalized = validation.valid ? validation.normalized : [];

  // Async data context
  let newsData: any[] | undefined;
  if (withData && requiresNews(normalized)) {
    newsData = await getNewsPosts(locale, includeDrafts);
  }

  // Render block tree
  const element = (
    <React.Fragment>
      {normalized.map((inst, i) => (
        <React.Fragment key={i}>{renderBlockInstance(inst, { locale, news: newsData })}</React.Fragment>
      ))}
    </React.Fragment>
  );

  const compiled: CompiledPage = {
    title: source.title ?? page.title,
    excerpt: source.excerpt ?? page.excerpt ?? undefined,
    version: page.currentVersion?.version,
    published,
    blocks: normalized,
    element,
  };

  cache.set(cacheKey({ ...opts, version: compiled.version, published }), { at: Date.now(), value: compiled });
  return compiled;
}

export function invalidatePageCache(slug: string, locale: Locale) {
  const prefix = `page:${locale}:${slug}`;
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function clearPageCompileCache() {
  cache.clear();
}
