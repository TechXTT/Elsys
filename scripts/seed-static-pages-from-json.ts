// scripts/seed-static-pages-from-json.ts
// Run with: pnpm pages:seed-json
// Reads static-page-blocks.json and upserts pages (BG locale) + PageVersion snapshot.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import "dotenv/config";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_LOCALE = "bg"; // backward-compatible default
const INPUT_FILE = path.join(process.cwd(), "static-page-blocks.json");

// Human-friendly Bulgarian labels for folders and pages
const FOLDER_LABELS: Record<string, string> = {
  uchilishteto: "Училището",
  obuchenie: "Обучение",
  priem: "Прием",
};

// English folder labels and slug mappings for top-level sections
const FOLDER_LABELS_EN: Record<string, string> = {
  uchilishteto: "The School",
  obuchenie: "Education",
  priem: "Admissions",
};

const FOLDER_SLUGS_EN: Record<string, string> = {
  uchilishteto: "school",
  obuchenie: "education",
  priem: "admissions",
};

const PAGE_LABELS: Record<string, string> = {
  home: "Начало",

  // Училището
  "uchilishteto/misija": "Мисия",
  "uchilishteto/istorija": "История",
  "uchilishteto/obshtestven-syvet": "Обществен съвет",
  "uchilishteto/lideri-zavyrshili-tues": "Лидери, завършили ТУЕС",
  "uchilishteto/prepodavatelski-ekip": "Преподавателски екип",
  "uchilishteto/asociacija-na-zavyrshilite-tues": "Асоциация на завършилите ТУЕС",
  "uchilishteto/pravilnici-i-dokumenti": "Правилници и документи",
  "uchilishteto/tues-v-chisla": "ТУЕС в числа",
  "uchilishteto/kontakti": "Контакти",

  // Обучение
  "obuchenie/inovativen-ucheben-podhod": "Иновативен учебен подход",
  "obuchenie/uchebna-programa": "Учебна програма",
  "obuchenie/profesionalno-obrazovanie": "Професионално образование",
  "obuchenie/integracija-s-tehnicheskija-uniersitet": "Интеграция с Техническия университет",
  "obuchenie/diplomna-rabota": "Дипломна работа",
  "obuchenie/cisco-akademija": "Cisco академия",
  "obuchenie/partniorstvo-s-biznesa": "Партньорство с бизнеса",
  "obuchenie/uchebna-praktika-po-specialnostta": "Учебна практика по специалността",

  // Прием
  "priem/specialnost-sistemno-programirane": "Специалност Системно програмиране",
  "priem/zashto-da-izbera-tues": "Защо да избера ТУЕС",
  "priem/specialnost-komputyrni-mreji": "Специалност Компютърни мрежи",
  "priem/den-na-otvorenite-vrati": "Ден на отворените врати",
  "priem/specialnost-programirane-na-izkustven-intelekt": "Специалност Програмиране на изкуствен интелект",
  "priem/red-i-uslovija-za-priem": "Ред и условия за прием",

  // Other
  "tues-talks": "TUES Talks",
};

const PAGE_LABELS_EN: Record<string, string> = {
  home: "Home",

  // School
  "uchilishteto/misija": "Mission",
  "uchilishteto/istorija": "History",
  "uchilishteto/obshtestven-syvet": "Public Council",
  "uchilishteto/lideri-zavyrshili-tues": "Alumni Leaders",
  "uchilishteto/prepodavatelski-ekip": "Teaching Staff",
  "uchilishteto/asociacija-na-zavyrshilite-tues": "TUES Alumni Association",
  "uchilishteto/pravilnici-i-dokumenti": "Rules and Documents",
  "uchilishteto/tues-v-chisla": "TUES in Numbers",
  "uchilishteto/kontakti": "Contacts",

  // Education
  "obuchenie/inovativen-ucheben-podhod": "Innovative Educational Approach",
  "obuchenie/uchebna-programa": "Curriculum",
  "obuchenie/profesionalno-obrazovanie": "Vocational Education",
  "obuchenie/integracija-s-tehnicheskija-uniersitet": "Integration with TU - Sofia",
  "obuchenie/diplomna-rabota": "Diploma Thesis",
  "obuchenie/cisco-akademija": "Cisco Academy",
  "obuchenie/partniorstvo-s-biznesa": "INVESTech / Business Partnerships",
  "obuchenie/uchebna-praktika-po-specialnostta": "Specialty Practicum",

  // Admissions
  "priem/specialnost-sistemno-programirane": "Specialty: System Programming",
  "priem/zashto-da-izbera-tues": "Why Choose TUES?",
  "priem/specialnost-komputyrni-mreji": "Specialty: Computer Networks",
  "priem/den-na-otvorenite-vrati": "TUES Fest – Open Day",
  "priem/specialnost-programirane-na-izkustven-intelekt": "Specialty: Artificial Intelligence Programming",
  "priem/red-i-uslovija-za-priem": "Admission Rules and Conditions",

  // Other
  "tues-talks": "TUES Talks",
};

// English leaf slug overrides by full BG path
const PAGE_SLUGS_EN: Record<string, string> = {
  // School
  "uchilishteto/misija": "mission",
  "uchilishteto/istorija": "history",
  "uchilishteto/obshtestven-syvet": "public-council",
  "uchilishteto/lideri-zavyrshili-tues": "alumni-leaders",
  "uchilishteto/prepodavatelski-ekip": "teaching-staff",
  "uchilishteto/asociacija-na-zavyrshilite-tues": "alumni-association",
  "uchilishteto/pravilnici-i-dokumenti": "rules-and-documents",
  "uchilishteto/tues-v-chisla": "tues-in-numbers",
  "uchilishteto/kontakti": "contacts",

  // Education
  "obuchenie/inovativen-ucheben-podhod": "innovative-education-approach",
  "obuchenie/uchebna-programa": "curriculum",
  "obuchenie/profesionalno-obrazovanie": "vocational-education",
  "obuchenie/integracija-s-tehnicheskija-uniersitet": "integration-with-tu-sofia",
  "obuchenie/diplomna-rabota": "diploma-thesis",
  "obuchenie/cisco-akademija": "cisco-academy",
  "obuchenie/partniorstvo-s-biznesa": "investech-business-partnerships",
  "obuchenie/uchebna-praktika-po-specialnostta": "specialty-practicum",

  // Admissions
  "priem/specialnost-sistemno-programirane": "specialty-system-programming",
  "priem/zashto-da-izbera-tues": "why-choose-tues",
  "priem/specialnost-komputyrni-mreji": "specialty-computer-networks",
  "priem/den-na-otvorenite-vrati": "tues-fest-open-day",
  "priem/specialnost-programirane-na-izkustven-intelekt": "specialty-artificial-intelligence-programming",
  "priem/red-i-uslovija-za-priem": "admission-rules-and-conditions",

  // Other
  "tues-talks": "tues-talks",
};

interface BlockInstance { type: string; props?: Record<string, unknown> }
interface PageBlocks { slug: string; url: string; blocks: BlockInstance[] }

function gid(prefix = "G|page") { return `${prefix}|${crypto.randomUUID()}`; }
function isRecord(v: unknown): v is Record<string, unknown> { return !!v && typeof v === "object" && !Array.isArray(v); }

// Minimal validation mirroring registry (subset)
function validateBlocks(raw: unknown): { ok: boolean; normalized: BlockInstance[]; errors: string[] } {
  if (!Array.isArray(raw)) return { ok: false, normalized: [], errors: ["Blocks must be array"] };
  const errors: string[] = [];
  const out: BlockInstance[] = [];
  raw.forEach((b, i) => {
    if (!isRecord(b) || typeof b.type !== "string") { errors.push(`Block[${i}] invalid shape`); return; }
    const props = isRecord(b.props) ? b.props : {};
    switch (b.type) {
      case "Hero": {
        const heading = typeof props.heading === "string" ? props.heading : "";
        if (!heading) { errors.push(`Block[${i}] Hero.heading missing`); return; }
        out.push({ type: "Hero", props });
        return;
      }
      case "Markdown": {
        out.push({ type: "Markdown", props: { value: typeof props.value === "string" ? props.value : "" } });
        return;
      }
      case "Section": {
        const title = typeof props.title === "string" ? props.title : "";
        if (!title) { errors.push(`Block[${i}] Section.title missing`); return; }
        out.push({ type: "Section", props: { title, description: typeof props.description === "string" ? props.description : "", markdown: typeof props.markdown === "string" ? props.markdown : "" } });
        return;
      }
      case "NewsList": {
        out.push({ type: "NewsList", props });
        return;
      }
      default:
        out.push({ type: b.type, props });
    }
  });
  return { ok: errors.length === 0, normalized: out, errors };
}

async function getNextVersion(pageId: string): Promise<number> {
  const latest = await prisma.pageVersion.findFirst({ where: { pageId }, orderBy: { version: "desc" }, select: { version: true } });
  return (latest?.version ?? 0) + 1;
}

async function ensureFolder(segment: string, locale: string): Promise<{ id: string }> {
  // FOLDER pages are globally unique by slug+locale under current schema.
  const existing = await prisma.page.findUnique({ where: { slug_locale: { slug: segment, locale } }, select: { id: true, title: true, navLabel: true } });
  const label = (locale === 'en' ? (FOLDER_LABELS_EN[segment] ?? beautifySlug(segment)) : (FOLDER_LABELS[segment] ?? beautifySlug(segment)));
  if (existing) {
    // Ensure existing folders also have friendly labels
    if ((existing.title ?? "") !== label || (existing.navLabel ?? "") !== label) {
      await prisma.page.update({ where: { id: existing.id }, data: { title: label, navLabel: label } });
    }
    return { id: existing.id };
  }
  const created = await prisma.page.create({
    data: {
      slug: segment,
      locale,
      title: label,
      navLabel: label,
      kind: "FOLDER",
      published: true,
      order: 0,
      visible: true,
      // groupId optional for folder; omit to satisfy schema if field wasn't added
    },
    select: { id: true }
  });
  return created;
}

async function upsertPageBG(p: PageBlocks) {
  const locale = 'bg';
  const fullSlug = p.slug === "" ? "home" : p.slug;
  const segments = fullSlug.split("/").filter(Boolean);
  const val = validateBlocks(p.blocks);
  if (!val.ok) console.warn(`[warn] ${fullSlug} block issues:`, val.errors.join("; "));

  // Homepage special case
  if (fullSlug === "home" || segments.length === 0) {
    const existingHome = await prisma.page.findUnique({ where: { slug_locale: { slug: "home", locale } }, include: { currentVersion: true } });
    const title = deriveTitle(val.normalized, "home", "home", locale);
    if (!existingHome) {
      const created = await prisma.page.create({ data: { slug: "home", locale, title, navLabel: title, published: true, kind: "PAGE", blocks: val.normalized as any, order: 0, visible: true }, select: { id: true } });
      const version = await getNextVersion(created.id);
      const pv = await prisma.pageVersion.create({ data: { pageId: created.id, version, title, published: true, blocks: val.normalized as any } });
      await prisma.page.update({ where: { id: created.id }, data: { currentVersionId: pv.id } });
      return { id: created.id, created: true };
    }
    // Update existing home
    const version = await getNextVersion(existingHome.id);
    const pv = await prisma.pageVersion.create({ data: { pageId: existingHome.id, version, title, published: true, blocks: val.normalized as any } });
    await prisma.page.update({ where: { id: existingHome.id }, data: { title, navLabel: title, blocks: val.normalized as any, currentVersionId: pv.id, published: true } });
    return { id: existingHome.id, created: false };
  }

  // Build / ensure folder chain (currently only first segment is used because of global slug uniqueness).
  let parentId: string | null = null;
  if (segments.length > 1) {
    // Only create top-level folder segment; deeper nesting would conflict with uniqueness constraint anyway.
    const folderSeg = segments[0];
    const folder = await ensureFolder(folderSeg, locale);
    parentId = folder.id;
  }
  const leafSlug = segments[segments.length - 1];

  // Detect existing page stored previously as full path (legacy) and migrate it.
  const legacyFull = await prisma.page.findUnique({ where: { slug_locale: { slug: fullSlug, locale } } });
  const existingLeaf = await prisma.page.findUnique({ where: { slug_locale: { slug: leafSlug, locale } }, include: { currentVersion: true } });

  // If we have a legacy full-path page and no leaf yet, transform it in-place.
  if (legacyFull && !existingLeaf) {
    const title = deriveTitle(val.normalized, fullSlug, leafSlug, locale);
    const version = await getNextVersion(legacyFull.id);
    const pv = await prisma.pageVersion.create({ data: { pageId: legacyFull.id, version, title, published: true, blocks: val.normalized as any } });
    await prisma.page.update({ where: { id: legacyFull.id }, data: { slug: leafSlug, parentId, title, navLabel: title, kind: "PAGE", blocks: val.normalized as any, currentVersionId: pv.id, published: true } });
    return { id: legacyFull.id, created: false };
  }

  const page = existingLeaf;
  const title = deriveTitle(val.normalized, fullSlug, leafSlug, locale);
  if (!page) {
    const created = await prisma.page.create({ data: { slug: leafSlug, locale, title, navLabel: title, parentId, published: true, kind: "PAGE", blocks: val.normalized as any, order: 0, visible: true }, select: { id: true } });
    const version = await getNextVersion(created.id);
    const pv = await prisma.pageVersion.create({ data: { pageId: created.id, version, title, published: true, blocks: val.normalized as any } });
    await prisma.page.update({ where: { id: created.id }, data: { currentVersionId: pv.id } });
    return { id: created.id, created: true };
  }
  const version = await getNextVersion(page.id);
  const pv = await prisma.pageVersion.create({ data: { pageId: page.id, version, title, published: true, blocks: val.normalized as any } });
  await prisma.page.update({ where: { id: page.id }, data: { title, navLabel: title, parentId, blocks: val.normalized as any, currentVersionId: pv.id, published: true } });
  return { id: page.id, created: false };
}

async function upsertPageEN(p: PageBlocks) {
  const locale = 'en';
  const fullSlugBG = p.slug === "" ? "home" : p.slug;
  const segmentsBG = fullSlugBG.split("/").filter(Boolean);
  const val = validateBlocks(p.blocks);
  if (!val.ok) console.warn(`[warn][en] ${fullSlugBG} block issues:`, val.errors.join("; "));
  const blocksEN = await translateBlocksToEN(val.normalized);

  // Resolve English slugs for folder+leaf
  if (fullSlugBG === "home" || segmentsBG.length === 0) {
    const existingHome = await prisma.page.findUnique({ where: { slug_locale: { slug: "home", locale } }, include: { currentVersion: true } });
    const title = deriveTitle(blocksEN, "home", "home", locale);
    if (!existingHome) {
      const created = await prisma.page.create({ data: { slug: "home", locale, title, navLabel: title, published: true, kind: "PAGE", blocks: blocksEN as any, order: 0, visible: true }, select: { id: true } });
      const version = await getNextVersion(created.id);
      const pv = await prisma.pageVersion.create({ data: { pageId: created.id, version, title, published: true, blocks: blocksEN as any } });
      await prisma.page.update({ where: { id: created.id }, data: { currentVersionId: pv.id } });
      return { id: created.id, created: true };
    }
    const version = await getNextVersion(existingHome.id);
    const pv = await prisma.pageVersion.create({ data: { pageId: existingHome.id, version, title, published: true, blocks: blocksEN as any } });
    await prisma.page.update({ where: { id: existingHome.id }, data: { title, navLabel: title, blocks: blocksEN as any, currentVersionId: pv.id, published: true } });
    return { id: existingHome.id, created: false };
  }

  let parentId: string | null = null;
  // Map only top-level folder segment
  if (segmentsBG.length > 1) {
    const folderBg = segmentsBG[0];
    const folderEnSlug = FOLDER_SLUGS_EN[folderBg] ?? folderBg;
    const folder = await ensureFolder(folderEnSlug, locale);
    parentId = folder.id;
  }
  const fullSlug = fullSlugBG; // key into maps
  const leafBg = segmentsBG[segmentsBG.length - 1];
  const leafEnSlug = PAGE_SLUGS_EN[fullSlug] ?? leafBg;

  // Migration from legacy full-path English (unlikely); try both
  const legacyFull = await prisma.page.findUnique({ where: { slug_locale: { slug: fullSlug, locale } } });
  const existingLeaf = await prisma.page.findUnique({ where: { slug_locale: { slug: leafEnSlug, locale } }, include: { currentVersion: true } });

  const title = deriveTitle(blocksEN, fullSlug, leafEnSlug, locale);
  if (legacyFull && !existingLeaf) {
    const version = await getNextVersion(legacyFull.id);
    const pv = await prisma.pageVersion.create({ data: { pageId: legacyFull.id, version, title, published: true, blocks: blocksEN as any } });
    await prisma.page.update({ where: { id: legacyFull.id }, data: { slug: leafEnSlug, parentId, title, navLabel: title, kind: "PAGE", blocks: blocksEN as any, currentVersionId: pv.id, published: true } });
    return { id: legacyFull.id, created: false };
  }

  if (!existingLeaf) {
    const created = await prisma.page.create({ data: { slug: leafEnSlug, locale, title, navLabel: title, parentId, published: true, kind: "PAGE", blocks: blocksEN as any, order: 0, visible: true }, select: { id: true } });
    const version = await getNextVersion(created.id);
    const pv = await prisma.pageVersion.create({ data: { pageId: created.id, version, title, published: true, blocks: blocksEN as any } });
    await prisma.page.update({ where: { id: created.id }, data: { currentVersionId: pv.id } });
    return { id: created.id, created: true };
  }
  const version = await getNextVersion(existingLeaf.id);
  const pv = await prisma.pageVersion.create({ data: { pageId: existingLeaf.id, version, title, published: true, blocks: blocksEN as any } });
  await prisma.page.update({ where: { id: existingLeaf.id }, data: { title, navLabel: title, parentId, blocks: blocksEN as any, currentVersionId: pv.id, published: true } });
  return { id: existingLeaf.id, created: false };
}

function beautifySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function deriveTitle(blocks: BlockInstance[], fullSlug: string, leafSlug: string, locale: string): string {
  const clean = (s: string) => s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // strip markdown links
    .replace(/^"+|"+$/g, '')
    .trim();

  // 1) Explicit overrides by full path or special keys (e.g., home)
  const override = (locale === 'en')
    ? (PAGE_LABELS_EN[fullSlug] ?? PAGE_LABELS_EN[leafSlug])
    : (PAGE_LABELS[fullSlug] ?? PAGE_LABELS[leafSlug]);
  if (override) return override;

  // 2) Try to infer from content blocks
  for (const b of blocks) {
    if (b.type === "Hero" && typeof b.props?.heading === "string" && b.props.heading) return clean(b.props.heading as string);
    if (b.type === "Section" && typeof b.props?.title === "string" && b.props.title) return clean(b.props.title as string);
  }

  // 3) Beautify the slug as a fallback
  return beautifySlug(leafSlug || fullSlug) || "Untitled";
}

// DeepL-powered translation (optional; no-op if DEEPL_API_KEY missing)
const deeplKey = process.env.DEEPL_API_KEY?.trim();
const deeplEndpoint = deeplKey?.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
const translateCache = new Map<string, string>();

async function translateText(text: string, from: "BG" | "AUTO" = "BG", to: "EN" | "EN-GB" | "EN-US" = "EN-GB"): Promise<string> {
  if (!text) return text;
  if (!deeplKey) return text;
  const cacheKey = `${from}:${to}:${text}`;
  const cached = translateCache.get(cacheKey);
  if (cached) return cached;
  try {
    const body = new URLSearchParams();
    body.append("text", text);
    body.append("target_lang", to);
    if (from !== "AUTO") body.append("source_lang", from);
    const res = await fetch(`${deeplEndpoint}/v2/translate`, {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${deeplKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      console.warn(`[deepl] translate failed ${res.status}: ${msg?.slice(0, 200)}`);
      return text;
    }
    const data = await res.json() as { translations?: Array<{ text: string }> };
    const out = data.translations?.[0]?.text ?? text;
    translateCache.set(cacheKey, out);
    return out;
  } catch (e) {
    console.warn(`[deepl] translate error`, e);
    return text;
  }
}

async function translateBlocksToEN(blocks: BlockInstance[]): Promise<BlockInstance[]> {
  const out: BlockInstance[] = [];
  for (const b of blocks) {
    if (!b?.props || typeof b.props !== "object") { out.push(b); continue; }
    const props = { ...(b.props as Record<string, unknown>) };
    if (b.type === "Hero") {
      if (typeof props.heading === "string") props.heading = await translateText(props.heading as string);
      out.push({ type: b.type, props });
      continue;
    }
    if (b.type === "Markdown") {
      if (typeof props.value === "string") props.value = await translateText(props.value as string);
      out.push({ type: b.type, props });
      continue;
    }
    if (b.type === "Section") {
      if (typeof props.title === "string") props.title = await translateText(props.title as string);
      if (typeof props.description === "string") props.description = await translateText(props.description as string);
      if (typeof props.markdown === "string") props.markdown = await translateText(props.markdown as string);
      out.push({ type: b.type, props });
      continue;
    }
    out.push({ type: b.type, props });
  }
  return out;
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Missing input file ${INPUT_FILE}. Run the scraper first.`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8")) as PageBlocks[];
  console.log(`Seeding ${raw.length} pages from static-page-blocks.json …`);
  for (const page of raw) {
    try {
      const bgRes = await upsertPageBG(page);
      const enRes = await upsertPageEN(page);
      console.log(`✓ bg:${page.slug || 'home'} -> ${bgRes.id} ${bgRes.created ? '(created)' : '(version+)'} | en:${page.slug || 'home'} -> ${enRes.id} ${enRes.created ? '(created)' : '(version+)'} `);
    } catch (err) {
      console.error(`✗ ${page.slug || 'home'} error`, err);
    }
  }
  console.log("Done.");
}

run().catch(err => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
