import * as cheerio from "cheerio";
import { ORIGIN } from "./lib/http";

// Sweboo TinyMCE HTML → the markdown/block model used by news + pages (G4 / M4.1).
// News + pages store `bodyMarkdown` (rendered via ReactMarkdown + remark-gfm), so
// the converter targets GFM markdown and separately collects referenced images.
// Round-trip-safe for the common tags; logs unconvertible fragments as warnings.

export interface ConvertResult {
  markdown: string;
  /** Distinct image URLs referenced in the body (absolutized), for the media pipeline. */
  images: { src: string; alt: string }[];
  /** Tags/fragments we dropped or couldn't faithfully convert. */
  warnings: string[];
}

const SUPPORTED = new Set([
  "p", "br", "hr", "a", "img", "strong", "b", "em", "i", "u",
  "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote",
  "table", "thead", "tbody", "tr", "td", "th", "div", "span", "figure", "figcaption", "iframe",
]);

function absolutize(src: string): string {
  if (!src) return src;
  if (/^https?:\/\//i.test(src)) return src;
  return `${ORIGIN}${src.startsWith("/") ? "" : "/"}${src}`;
}

export function htmlToBlocks(html: string): ConvertResult {
  const $ = cheerio.load(html ?? "");
  const images: { src: string; alt: string }[] = [];
  const warnings = new Set<string>();
  const seenImg = new Set<string>();

  function inline(el: any): string {
    const node = $(el);
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (el.type === "text") return node.text();
    if (!tag) return "";
    if (!SUPPORTED.has(tag)) warnings.add(tag);
    switch (tag) {
      case "br": return "  \n";
      case "strong": case "b": return `**${kids(el)}**`;
      case "em": case "i": return `*${kids(el)}*`;
      case "u": return kids(el);
      case "a": {
        let href = node.attr("href") ?? "";
        if (href.startsWith("/")) href = absolutize(href);
        const text = kids(el).trim() || href;
        return href ? `[${text}](${href})` : text;
      }
      case "img": {
        const src = absolutize(node.attr("src") ?? "");
        const alt = node.attr("alt") ?? "";
        if (src && !seenImg.has(src)) { seenImg.add(src); images.push({ src, alt }); }
        return src ? `![${alt}](${src})` : "";
      }
      default: return kids(el);
    }
  }

  function kids(el: any): string {
    return $(el).contents().toArray().map((c) => inline(c)).join("");
  }

  const blocks: string[] = [];
  function block(el: any) {
    const node = $(el);
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (el.type === "text") { const t = node.text().trim(); if (t) blocks.push(t); return; }
    if (!tag) return;
    switch (tag) {
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": {
        const lvl = Number(tag[1]);
        blocks.push(`${"#".repeat(lvl)} ${kids(el).trim()}`);
        return;
      }
      case "p": case "figcaption": { const t = inline(el).trim(); if (t) blocks.push(t); return; }
      case "hr": blocks.push("---"); return;
      case "blockquote": blocks.push(kids(el).trim().split("\n").map((l) => `> ${l}`).join("\n")); return;
      case "ul": case "ol": {
        const items = node.children("li").toArray()
          .map((li, i) => `${tag === "ol" ? `${i + 1}.` : "-"} ${inline(li).trim()}`)
          .filter((l) => l.replace(/^[-\d.]+\s*/, "").length > 0);
        if (items.length) blocks.push(items.join("\n"));
        return;
      }
      case "img": { const t = inline(el); if (t) blocks.push(t); return; }
      case "table": {
        const rows = node.find("tr").toArray();
        if (!rows.length) return;
        const toCells = (tr: any) => $(tr).find("th,td").toArray().map((c) => inline(c).trim().replace(/\|/g, "\\|"));
        const header = toCells(rows[0]);
        blocks.push(`| ${header.join(" | ")} |`);
        blocks.push(`| ${header.map(() => "---").join(" | ")} |`);
        for (const tr of rows.slice(1)) blocks.push(`| ${toCells(tr).join(" | ")} |`);
        blocks.push("");
        return;
      }
      case "iframe": {
        warnings.add("iframe(embed)");
        const src = node.attr("src");
        if (src) blocks.push(`[embed](${absolutize(src)})`);
        return;
      }
      case "div": case "span": case "figure": case "section": case "article": {
        // Recurse into wrappers.
        node.children().each((_, c) => block(c));
        return;
      }
      default: {
        warnings.add(tag);
        const t = inline(el).trim();
        if (t) blocks.push(t);
      }
    }
  }

  // Walk the top-level body.
  const root = $("body").length ? $("body")[0] : ($.root()[0] as unknown as any);
  $(root).contents().each((_, c) => block(c));

  const markdown = blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  return { markdown, images, warnings: Array.from(warnings) };
}
