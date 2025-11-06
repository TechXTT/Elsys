// Import page content from https://elsys-bg.org into the CMS (excluding news)
// Usage:
//   PRISMA_DATABASE_URL=... node scripts/import-from-elsys-bg.mjs
// Notes:
// - For each Page (bg/en) it tries multiple candidate URLs on the original site
// - Scrapes the main content area heuristically and converts to Markdown
// - Updates title/excerpt/bodyMarkdown and sets a Markdown block

import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";
import fetch from "node-fetch";

const prisma = new PrismaClient();

const ORIGIN = "https://elsys-bg.org";
const EXCLUDED_PREFIXES = new Set(["news", "events"]);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function htmlToMarkdown(html = "") {
  if (!html || typeof html !== "string") return "";
  const $ = cheerio.load(html, { decodeEntities: true });
  function walk(el) {
    const node = $(el);
    const tag = el.tagName?.toLowerCase();
    if (el.type === "text") return node.text();
    if (tag === "br") return "\n";
    if (tag === "hr") return "\n\n---\n\n";
    if (tag === "img") {
      const alt = node.attr("alt") || "";
      let src = node.attr("src") || "";
      if (src && src.startsWith("/")) src = `${ORIGIN}${src}`; // absolutize
      return src ? `![${alt}](${src})` : "";
    }
    if (tag === "a") {
      let href = node.attr("href") || "";
      if (href && href.startsWith("/")) href = `${ORIGIN}${href}`;
      const text = node.text().trim();
      return href ? `[${text || href}](${href})` : text;
    }
    if (["strong", "b"].includes(tag)) {
      return `**${node.contents().map((_, c) => walk(c)).get().join("")}**`;
    }
    if (["em", "i"].includes(tag)) {
      return `*${node.contents().map((_, c) => walk(c)).get().join("")}*`;
    }
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      const level = Number(tag.substring(1));
      const text = node.contents().map((_, c) => walk(c)).get().join("").trim();
      return `\n\n${"#".repeat(Math.min(6, Math.max(1, level)))} ${text}\n\n`;
    }
    if (tag === "p") {
      const inner = node.contents().map((_, c) => walk(c)).get().join("").trim();
      return inner ? `\n\n${inner}\n\n` : "\n\n";
    }
    if (["ul", "ol"].includes(tag)) {
      const items = node.children("li").toArray().map((li, idx) => {
        const content = $(li).contents().map((_, c) => walk(c)).get().join("").trim();
        if (!content) return "";
        if (tag === "ol") return `${idx + 1}. ${content}`;
        return `- ${content}`;
      }).filter(Boolean);
      return items.length ? `\n\n${items.join("\n")}\n\n` : "";
    }
    if (tag === "blockquote") {
      const inner = node.contents().map((_, c) => walk(c)).get().join("").trim();
      return inner ? `\n\n> ${inner}\n\n` : "";
    }
    // Generic container
    return node.contents().map((_, c) => walk(c)).get().join("");
  }
  // Strip scripts/styles/navs before walking
  $("script, style, noscript").remove();
  const md = $.root().contents().map((_, c) => walk(c)).get().join("");
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

function pickMainContent($) {
  // Remove obvious non-content
  $("header, footer, nav, aside, form, script, style, noscript").remove();
  const candidates = [
    "main",
    "#content",
    ".content",
    ".page-content",
    "article",
    ".post",
    ".entry-content",
  ];
  let best = null;
  let bestLen = 0;
  for (const sel of candidates) {
    $(sel).each((_, el) => {
      const len = $(el).text().trim().length;
      if (len > bestLen) { best = el; bestLen = len; }
    });
  }
  if (!best) {
    // fallback: largest div
    $("div").each((_, el) => {
      const len = $(el).text().trim().length;
      if (len > bestLen) { best = el; bestLen = len; }
    });
  }
  // Always return a Cheerio selection
  return best ? $(best) : $("body");
}

function extractTitleAndExcerpt($, $main) {
  const title = $main.find("h1").first().text().trim() || $("title").first().text().trim() || "";
  // first paragraph with reasonable length
  let excerpt = "";
  $main.find("p").each((_, p) => {
    const t = $(p).text().replace(/\s+/g, " ").trim();
    if (t.length >= 40) { excerpt = t.slice(0, 220); return false; }
    return undefined;
  });
  return { title, excerpt };
}

function buildCandidates(slug, locale) {
  const s = slug.replace(/^\/+/, "").replace(/\/+$/, "");
  const candidates = [
    `${ORIGIN}/${s}`,
    `${ORIGIN}/${s}/`,
  ];
  if (locale) {
    candidates.unshift(`${ORIGIN}/${locale}/${s}`);
    candidates.unshift(`${ORIGIN}/${locale}/${s}/`);
  }
  return Array.from(new Set(candidates));
}

async function fetchFirstOk(urls) {
  for (const u of urls) {
    try {
      const res = await fetch(u, { redirect: "follow" });
      if (res.ok) {
        const html = await res.text();
        return { url: u, html };
      }
    } catch {
      // try next
    }
    await sleep(150);
  }
  return null;
}

// --- Discovery helpers ---
const sectionIndexCache = new Map(); // key: `${locale}:${section}` -> { url, html, links: string[] }

function simplify(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}+/gu, "")
    .replace(/\s+/g, " ")
    .replace(/%[0-9a-f]{2}/gi, "")
    .replace(/[^a-z0-9/_-]+/g, "");
}

function pathToTokens(pathname = "") {
  const p = simplify(pathname.replace(ORIGIN, ""));
  return p.split(/[\/-]+/).filter(Boolean);
}

function jaccard(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  const inter = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size === 0 ? 0 : inter.size / union.size;
}

async function getLinksFrom(url) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const links = new Map(); // href -> { href, text }
    $("a[href]").each((_, a) => {
      let href = String($(a).attr("href") || "").trim();
      const text = $(a).text().trim();
      if (!href) return;
      if (href.startsWith("#")) return;
      // absolutize
      if (href.startsWith("/")) href = `${ORIGIN}${href}`;
      try {
        const u = new URL(href);
        if (u.origin !== ORIGIN) return; // skip external
        const abs = u.toString().replace(/\/?$/, "/");
        links.set(abs, { href: abs, text });
      } catch {
        // ignore
      }
    });
    return { html, links: Array.from(links.values()) };
  } catch {
    return [];
  }
}

async function loadSectionIndex(locale, section) {
  const key = `${locale}:${section}`;
  if (sectionIndexCache.has(key)) return sectionIndexCache.get(key);
  const urls = [
    `${ORIGIN}/${locale}/${section}/`,
    `${ORIGIN}/${section}/`,
  ];
  for (const u of urls) {
    const data = await getLinksFrom(u);
    if (Array.isArray(data)) continue;
    sectionIndexCache.set(key, { url: u, html: data.html, links: data.links });
    return sectionIndexCache.get(key);
  }
  // Fallback: use site-wide navigation from the homepage
  const home = await getLinksFrom(`${ORIGIN}/`);
  if (!Array.isArray(home)) {
    sectionIndexCache.set(key, { url: ORIGIN, html: home.html, links: home.links });
    return sectionIndexCache.get(key);
  }
  sectionIndexCache.set(key, { url: null, html: "", links: [] });
  return sectionIndexCache.get(key);
}

async function discoverUrlForSlug(slug, locale) {
  const clean = slug.replace(/^\/+/, "").replace(/\/+$/, "");
  const [section, ...rest] = clean.split("/");
  // Special-case known nested anchors: map to base page
  if (section === "obuchenie" && rest[0] === "uchebna-programa") {
    // Return ALL candidates so fetchFirstOk can try each
    return buildCandidates("obuchenie/uchebna-programa", locale);
  }
  const idx = await loadSectionIndex(locale, section);
  const targetTokens = pathToTokens(clean);
  const scored = [];
  for (const { href, text } of idx.links) {
    try {
      const u = new URL(href);
      const path = u.pathname.replace(/\/?$/, "/");
      const top = path.split("/")[1];
      if (EXCLUDED_PREFIXES.has(top)) continue;
      const pathScore = jaccard(targetTokens, pathToTokens(path));
      const textScore = text ? jaccard(targetTokens, pathToTokens(simplify(text))) : 0;
      const sectionBonus = path.includes(`/${section}/`) ? 0.05 : 0;
      const score = Math.max(pathScore, textScore) + sectionBonus;
      if (score >= 0.30) scored.push([score, href]);
    } catch {}
  }
  if (scored.length) {
    scored.sort((a, b) => b[0] - a[0]);
    return scored.slice(0, 5).map(([, href]) => href);
  }
  return null;
}

// Very small transliteration helpers for known differences on this site
function translitVariants(slug) {
  const v = new Set([slug]);
  v.add(slug.replace("uchenicheski-zhivot", "uchenicheski-jivot"));
  v.add(slug.replace("zavurshili", "zavyrshili"));
  v.add(slug.replace("savet", "syvet"));
  v.add(slug.replace("sabitijata", "sybitijata"));
  return [...v].filter((s) => s !== slug);
}

async function run() {
  const pages = await prisma.page.findMany({ orderBy: [{ locale: "asc" }, { slug: "asc" }] });
  let ok = 0; let miss = 0; let skipped = 0;
  for (const p of pages) {
    const top = p.slug.split("/")[0];
    if (EXCLUDED_PREFIXES.has(top)) { skipped++; continue; }
    // Try direct candidates first
    const candidates = buildCandidates(p.slug, p.locale);
    let found = await fetchFirstOk(candidates);
    // If not found, try discovery on section index pages
    if (!found) {
      const discovered = await discoverUrlForSlug(p.slug, p.locale);
      if (discovered) {
        const list = Array.isArray(discovered) ? discovered : [discovered];
        found = await fetchFirstOk(list);
      }
    }
    // If still not found, try a couple of transliteration variants
    if (!found) {
      for (const alt of translitVariants(p.slug)) {
        const more = buildCandidates(alt, p.locale);
        found = await fetchFirstOk(more);
        if (found) break;
      }
    }
    if (!found) { console.log(`MISS ${p.locale}:${p.slug}`); miss++; continue; }
    const $ = cheerio.load(found.html);
    const $main = pickMainContent($);
    const { title, excerpt } = extractTitleAndExcerpt($, $main);
    // Inner HTML of main area only
    const inner = $main.html() || "";
    const md = htmlToMarkdown(inner);
    try {
      await prisma.page.update({
        where: { id: p.id },
        data: {
          title: title || p.title,
          excerpt: excerpt || p.excerpt,
          bodyMarkdown: md || p.bodyMarkdown,
          blocks: md ? [{ type: "Markdown", props: { value: md } }] : p.blocks,
          published: true,
        },
      });
      console.log(`OK   ${p.locale}:${p.slug} <- ${found.url}`);
      ok++;
    } catch (e) {
      console.error(`FAIL ${p.locale}:${p.slug}`, e);
      miss++;
    }
    await sleep(250);
  }
  console.log("Import summary:");
  console.log(`  updated: ${ok}`);
  console.log(`  missed:  ${miss}`);
  console.log(`  skipped: ${skipped}`);
}

(async () => {
  try {
    await run();
  } finally {
    await prisma.$disconnect();
  }
})();
