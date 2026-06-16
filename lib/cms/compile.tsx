import React from "react";
import { prisma } from "@/lib/prisma";
import { validateBlocks, renderBlockInstance, collectBlockNeeds, type BlockInstance } from "@/lib/blocks/registry";
import { loadBlockData } from "@/lib/cms/block-data";
import { isPublic } from "@/lib/content/shared";
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

  // Content comes from the current published version snapshot (if any); public
  // visibility is the page's canonical status (R3 — isPublic). Pages have no date.
  const source = page.currentVersion ?? page;
  const published = isPublic(page);
  if (!includeDrafts && !published) return null; // hide drafts if not requested

  // Validate blocks
  const rawBlocks = source.blocks ?? [];
  const validation = validateBlocks(rawBlocks);
  const normalized = validation.valid ? validation.normalized : [];

  // R4: fetch only what the page's blocks declare via `needs`, in one Promise.all.
  const data = withData
    ? await loadBlockData(collectBlockNeeds(normalized), locale, includeDrafts)
    : {};
  const ctx = { locale, ...data };

  // Render block tree
  const element = (
    <React.Fragment>
      {normalized.map((inst, i) => (
        <React.Fragment key={i}>{renderBlockInstance(inst, ctx)}</React.Fragment>
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
