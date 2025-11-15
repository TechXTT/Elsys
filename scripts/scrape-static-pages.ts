// scripts/scrape-static-pages.ts
// Run with: pnpm pages:scrape
// Produces static-page-blocks.json with block definitions for each static page.

import fs from "node:fs";
import path from "node:path";
import TurndownService from "turndown";
import { JSDOM } from "jsdom";

const ORIGIN = "https://elsys-bg.org";

// Matches BlockInstance shape consumed by editor
export type BlockInstance = { type: string; props: Record<string, unknown> };

export interface PageSpec { slug: string; url: string }
export interface PageBlocks extends PageSpec { blocks: BlockInstance[] }

// Legacy static page list (BG locale)
const STATIC_PAGES: PageSpec[] = [
  { slug: "uchilishteto/misija", url: `${ORIGIN}/uchilishteto/misija` },
  { slug: "uchilishteto/istorija", url: `${ORIGIN}/uchilishteto/istorija` },
  { slug: "uchilishteto/obshtestven-syvet", url: `${ORIGIN}/uchilishteto/obshtestven-syvet` },
  { slug: "uchilishteto/lideri-zavyrshili-tues", url: `${ORIGIN}/uchilishteto/lideri-zavyrshili-tues` },
  { slug: "uchilishteto/prepodavatelski-ekip", url: `${ORIGIN}/uchilishteto/prepodavatelski-ekip` },
  { slug: "uchilishteto/asociacija-na-zavyrshilite-tues", url: `${ORIGIN}/uchilishteto/asociacija-na-zavyrshilite-tues` },
  { slug: "uchilishteto/pravilnici-i-dokumenti", url: `${ORIGIN}/uchilishteto/pravilnici-i-dokumenti` },
  { slug: "uchilishteto/tues-v-chisla", url: `${ORIGIN}/uchilishteto/tues-v-chisla` },
  { slug: "uchilishteto/kontakti", url: `${ORIGIN}/uchilishteto/kontakti` },
  { slug: "obuchenie/inovativen-ucheben-podhod", url: `${ORIGIN}/obuchenie/inovativen-ucheben-podhod` },
  { slug: "obuchenie/uchebna-programa", url: `${ORIGIN}/obuchenie/uchebna-programa` },
  { slug: "obuchenie/profesionalno-obrazovanie", url: `${ORIGIN}/obuchenie/profesionalno-obrazovanie` },
  { slug: "obuchenie/integracija-s-tehnicheskija-uniersitet", url: `${ORIGIN}/obuchenie/integracija-s-tehnicheskija-uniersitet` },
  { slug: "obuchenie/diplomna-rabota", url: `${ORIGIN}/obuchenie/diplomna-rabota` },
  { slug: "obuchenie/cisco-akademija", url: `${ORIGIN}/obuchenie/cisco-akademija` },
  { slug: "obuchenie/partniorstvo-s-biznesa", url: `${ORIGIN}/obuchenie/partniorstvo-s-biznesa` },
  { slug: "obuchenie/uchebna-praktika-po-specialnostta", url: `${ORIGIN}/obuchenie/uchebna-praktika-po-specialnostta` },
  { slug: "priem/specialnost-sistemno-programirane", url: `${ORIGIN}/priem/specialnost-sistemno-programirane` },
  { slug: "priem/zashto-da-izbera-tues", url: `${ORIGIN}/priem/zashto-da-izbera-tues` },
  { slug: "priem/specialnost-komputyrni-mreji", url: `${ORIGIN}/priem/specialnost-komputyrni-mreji` },
  { slug: "priem/den-na-otvorenite-vrati", url: `${ORIGIN}/priem/den-na-otvorenite-vrati` },
  { slug: "priem/specialnost-programirane-na-izkustven-intelekt", url: `${ORIGIN}/priem/specialnost-programirane-na-izkustven-intelekt` },
  { slug: "priem/red-i-uslovija-za-priem", url: `${ORIGIN}/priem/red-i-uslovija-za-priem` },
  { slug: "tues-talks", url: `${ORIGIN}/tues-talks` },
];

// Turndown config
const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });

// Candidate selectors ordered from most specific to most generic. We intentionally
// omit plain 'body' now to avoid pulling headers/footers/navigation.
const MAIN_SELECTORS = [
  "main article .entry-content",
  "main .entry-content",
  "article .entry-content",
  "#content .entry-content",
  "#content article",
  "#primary .entry-content",
  "#main .entry-content",
  ".site-content .entry-content",
  // extra generic wrappers that often hold the main text
  ".page-content",
  ".content",
  ".page-body",
  "main",
  "#content",
  ".site-content",
  ".content-area"
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function extractMainHtml(html: string): string {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Remove clearly non-content elements to reduce noise if we fall back.
  const junkSelectors = ["header", "footer", "nav", "aside", ".sidebar", ".widget", "script", "style" ];
  junkSelectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach((el: Element) => el.remove());
  });

  for (const sel of MAIN_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el) return el.innerHTML;
  }

  // Heuristic fallback: choose largest text container among generic candidates.
  const candidates = Array.from(doc.querySelectorAll("main, #content, .site-content, .content-area, article, body")) as Element[];
  let best: Element | null = null;
  let bestLen = 0;
  for (const el of candidates) {
    const textLen = (el.textContent || "").trim().length;
    if (textLen > bestLen) { best = el; bestLen = textLen; }
  }
  if (best) return best.innerHTML;
  // Ultimate fallback: return body innerHTML if available
  return (doc.body as any)?.innerHTML || ""; // Return empty; calling code handles empty markdown
}

function markdownToBlocks(markdown: string): BlockInstance[] {
  const lines = markdown.split(/\r?\n/);
  const intro: string[] = [];
  const sections: { title: string; lines: string[] }[] = [];
  let current: { title: string; lines: string[] } | null = null;

  const cleanHeading = (h: string) => {
    // Strip markdown link syntax [text](url "title") -> text
    let out = h.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    // Remove stray quotes around heading
    out = out.replace(/^"+|"+$/g, '').trim();
    return out.trim();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#\s+/.test(line)) { // treat H1 as bold intro line
      const txt = line.replace(/^#\s+/, "").trim();
      if (txt) intro.push(`**${txt}**`);
      continue;
    }
    if (/^##\s+/.test(line) || /^###\s+/.test(line)) {
      const rawTitle = line.replace(/^#{2,3}\s+/, "").trim();
      const title = cleanHeading(rawTitle);
      if (current) sections.push(current);
      current = { title, lines: [] };
      continue;
    }
    if (current) current.lines.push(line); else intro.push(line);
  }
  if (current) sections.push(current);

  const blocks: BlockInstance[] = [];
  const introMd = intro.join("\n").trim();
  if (introMd) blocks.push({ type: "Markdown", props: { value: introMd } });
  for (const s of sections) {
    const body = s.lines.join("\n").trim();
    blocks.push({ type: "Section", props: { title: s.title, description: "", markdown: body } });
  }
  if (!blocks.length && markdown.trim()) {
    blocks.push({ type: "Markdown", props: { value: markdown.trim() } });
  }
  return blocks;
}

async function fetchPage(page: PageSpec): Promise<PageBlocks> {
  console.log(`Fetching ${page.slug || "/"} …`);
  const res = await fetch(page.url);
  if (!res.ok) {
    console.warn(`  ! ${page.url} -> ${res.status}`);
    return { ...page, blocks: [] };
  }
  const html = await res.text();
  const mainHtml = extractMainHtml(html);
  const markdownRaw = turndown.turndown(mainHtml || "").trim();
  const markdown = markdownRaw.replace(/\n{3,}/g, "\n\n");
  const blocks = markdownToBlocks(markdown);
  console.log(`  ✓ ${blocks.length} blocks`);
  return { ...page, blocks };
}

async function run() {
  const out: PageBlocks[] = [];
  for (const p of STATIC_PAGES) {
    try {
      out.push(await fetchPage(p));
    } catch (err) {
      console.error(`Error ${p.url}`, err);
      out.push({ ...p, blocks: [] });
    }
    await sleep(350); // polite delay
  }
  const outfile = path.join(process.cwd(), "static-page-blocks.json");
  fs.writeFileSync(outfile, JSON.stringify(out, null, 2), "utf8");
  console.log(`\nDone. Wrote ${out.length} pages -> ${outfile}`);
}

run().catch(err => { console.error(err); process.exit(1); });
