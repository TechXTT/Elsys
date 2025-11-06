// Migrate filesystem section pages (except news) into the CMS Page table
// Usage:
//   PRISMA_DATABASE_URL=... node scripts/migrate-content-to-cms.mjs
// Notes:
// - Creates/updates Page records for bg/en locales based on content/<locale>/*/index.json
// - Excludes the "news" and "events" sections
// - Converts legacy HTML body to basic Markdown using cheerio

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

const CONTENT_DIR = path.join(process.cwd(), "content");
const LOCALES = ["bg", "en"];
// We'll discover sections/files dynamically; still exclude these roots entirely
const EXCLUDED_ROOTS = new Set(["news", "events"]);

function htmlToMarkdown(html = "") {
  if (!html || typeof html !== "string") return "";
  // Normalize whitespace a little to reduce noisy MD
  const $ = cheerio.load(html, { decodeEntities: true });

  function walk(el) {
    const node = $(el);
    const tag = el.tagName?.toLowerCase();

    if (el.type === "text") {
      return node.text();
    }

    if (tag === "br") return "\n";
    if (tag === "hr") return "\n\n---\n\n";
    if (tag === "img") {
      const alt = node.attr("alt") || "";
      const src = node.attr("src") || "";
      return src ? `![${alt}](${src})` : "";
    }
    if (tag === "a") {
      const href = node.attr("href") || "";
      const text = node.text().trim();
      return href ? `[${text || href}](${href})` : text;
    }
    if (["strong", "b"].includes(tag)) {
      return `**${node.contents().map((_, c) => walk(c)).get().join("") }**`;
    }
    if (["em", "i"].includes(tag)) {
      return `*${node.contents().map((_, c) => walk(c)).get().join("") }*`;
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
    // Generic container: span, div, figure, etc.
    return node.contents().map((_, c) => walk(c)).get().join("");
  }

  const parts = $.root().contents().map((_, c) => walk(c)).get();
  const md = parts.join("");
  // Collapse excessive newlines
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(relPath, "utf8"));
  } catch (e) {
    return null;
  }
}

async function upsertPage({ slug, locale, title, excerpt, bodyHtml }) {
  const bodyMarkdown = htmlToMarkdown(bodyHtml || "");
  const blocks = bodyMarkdown
    ? [{ type: "Markdown", props: { value: bodyMarkdown } }]
    : [];
  const data = {
    slug,
    locale,
    title: title || slug,
    excerpt: excerpt || null,
    bodyMarkdown: bodyMarkdown || null,
    blocks,
    published: true,
  };
  // Use the compound unique key slug+locale when available
  return prisma.page.upsert({
    where: { slug_locale: { slug, locale } },
    update: data,
    create: data,
  });
}

function walkIndexJsonFiles(locale) {
  const base = path.join(CONTENT_DIR, locale);
  const files = [];
  function walk(dirRel) {
    const dirAbs = path.join(base, dirRel);
    for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const rel = path.join(dirRel, entry.name);
      const top = rel.split(path.sep)[0];
      if (EXCLUDED_ROOTS.has(top)) continue;
      if (entry.isDirectory()) {
        walk(rel);
      } else if (entry.isFile() && entry.name === "index.json") {
        files.push(path.join(base, rel));
      }
    }
  }
  walk("");
  return files;
}

function sectionOfSlug(slug = "") {
  const i = slug.indexOf("/");
  return i === -1 ? slug : slug.slice(0, i);
}

async function migrate() {
  // Track counts by locale/section for a friendly summary
  const counts = new Map(); // key: `${locale}:${section}` -> number
  for (const locale of LOCALES) {
    const files = walkIndexJsonFiles(locale);
    for (const fileAbs of files) {
      const arr = readJson(fileAbs);
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        let href = (item.href || "").trim();
        if (!href) continue;
        if (href.startsWith("/")) href = href.slice(1);
        // Skip excluded roots even if referenced from nested indexes
        if (EXCLUDED_ROOTS.has(href.split("/")[0])) continue;
        const slug = href;
        try {
          await upsertPage({
            slug,
            locale,
            title: item.title,
            excerpt: item.excerpt,
            bodyHtml: item.body,
          });
          const sec = sectionOfSlug(slug);
          const key = `${locale}:${sec}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        } catch (e) {
          console.error(`Failed to upsert ${locale}:${slug}`, e);
        }
      }
    }
  }
  // Convert to printable results
  const results = Array.from(counts.entries()).map(([key, count]) => {
    const [locale, section] = key.split(":");
    return { locale, section, count };
  }).sort((a, b) => a.locale.localeCompare(b.locale) || a.section.localeCompare(b.section));
  return results;
}

(async () => {
  try {
    const res = await migrate();
    console.log("Migration summary:");
    for (const r of res) {
      console.log(`  ${r.locale}/${r.section}: ${r.count} pages upserted`);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
