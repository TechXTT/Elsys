import * as cheerio from "cheerio";
import { htmlToBlocks } from "./html-to-blocks";
import type { LegacyUrl } from "./crawl";

// Per-type extractors (G4 / M4.1). Sweboo content body lives in
// `.single-text > .text`, titled by `.page-title`. News/blog → NewsPost; the
// 2-level page tree + everything else structurally-uniform → Page. Each record
// keeps legacyId + legacyUrl for idempotent upserts.

export interface ExtractedNews {
  kind: "news";
  legacyId: number;
  legacyUrl: string;
  slug: string;
  title: string;
  markdown: string;
  date: string | null; // ISO; null → importer defaults + flags
  images: { src: string; alt: string }[];
  featuredImage: string | null;
  category: string | null; // "Блог" for /blog/*
  warnings: string[];
}

export interface ExtractedPage {
  kind: "page";
  legacyId: number | null;
  legacyUrl: string;
  slug: string;
  parentSlug: string | null; // first path segment (obuchenie/priem/…)
  title: string;
  markdown: string;
  images: { src: string; alt: string }[];
  warnings: string[];
}

export type Extracted = ExtractedNews | ExtractedPage;

function bodyParts(html: string): { title: string; bodyHtml: string; date: string | null } {
  const $ = cheerio.load(html);
  const container = $(".single-text .text").first().length ? $(".single-text .text").first() : $(".single-text").first();
  const title = (container.find(".page-title").first().text().trim() || $("title").text().trim());
  container.find(".page-title").remove();
  // Date heuristics: meta, common Sweboo elements, else null.
  const date =
    $('meta[property="article:published_time"]').attr("content") ||
    $(".date, .published, time").first().attr("datetime") ||
    parseDateText($(".date, .published").first().text()) ||
    null;
  return { title, bodyHtml: container.html() ?? "", date };
}

function parseDateText(text: string): string | null {
  const m = text?.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

export function extractNews(html: string, src: LegacyUrl): ExtractedNews | null {
  if (src.legacyId == null || !src.slug) return null;
  const { title, bodyHtml, date } = bodyParts(html);
  const { markdown, images, warnings } = htmlToBlocks(bodyHtml);
  return {
    kind: "news",
    legacyId: src.legacyId,
    legacyUrl: src.url,
    slug: src.slug,
    title: title || src.slug,
    markdown,
    date,
    images,
    featuredImage: images[0]?.src ?? null,
    category: src.type === "blog" ? "Блог" : null,
    warnings,
  };
}

export function extractPage(html: string, src: LegacyUrl): ExtractedPage | null {
  const { title, bodyHtml } = bodyParts(html);
  const { markdown, images, warnings } = htmlToBlocks(bodyHtml);
  const segs = src.pathname.replace(/^\/|\/$/g, "").split("/");
  const slug = src.slug ?? segs[segs.length - 1];
  const parentSlug = segs.length > 1 ? segs[0] : null;
  if (!slug) return null;
  return { kind: "page", legacyId: src.legacyId, legacyUrl: src.url, slug, parentSlug, title: title || slug, markdown, images, warnings };
}

/** Dispatch by crawl classification. news/blog → news; page/item/other → page. */
export function extract(html: string, src: LegacyUrl): Extracted | null {
  if (src.type === "news" || src.type === "blog") return extractNews(html, src);
  return extractPage(html, src);
}
