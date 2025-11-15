// scripts/seed-static-pages-from-json.ts
// Run with: pnpm pages:seed-json
// Reads static-page-blocks.json and upserts pages (BG locale) + PageVersion snapshot.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const LOCALE = "bg"; // Adjust / parameterize as needed
const INPUT_FILE = path.join(process.cwd(), "static-page-blocks.json");

// Human-friendly Bulgarian labels for folders and pages
const FOLDER_LABELS: Record<string, string> = {
  uchilishteto: "Училището",
  obuchenie: "Обучение",
  priem: "Прием",
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

async function ensureFolder(segment: string): Promise<{ id: string }> {
  // FOLDER pages are globally unique by slug+locale under current schema.
  const existing = await prisma.page.findUnique({ where: { slug_locale: { slug: segment, locale: LOCALE } }, select: { id: true, title: true, navLabel: true } });
  const label = FOLDER_LABELS[segment] ?? beautifySlug(segment);
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
      locale: LOCALE,
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

async function upsertPage(p: PageBlocks) {
  const fullSlug = p.slug === "" ? "home" : p.slug;
  const segments = fullSlug.split("/").filter(Boolean);
  const val = validateBlocks(p.blocks);
  if (!val.ok) console.warn(`[warn] ${fullSlug} block issues:`, val.errors.join("; "));

  // Homepage special case
  if (fullSlug === "home" || segments.length === 0) {
    const existingHome = await prisma.page.findUnique({ where: { slug_locale: { slug: "home", locale: LOCALE } }, include: { currentVersion: true } });
    const title = deriveTitle(val.normalized, "home", "home");
    if (!existingHome) {
      const created = await prisma.page.create({ data: { slug: "home", locale: LOCALE, title, navLabel: title, published: true, kind: "PAGE", blocks: val.normalized as any, order: 0, visible: true }, select: { id: true } });
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
    const folder = await ensureFolder(folderSeg);
    parentId = folder.id;
  }
  const leafSlug = segments[segments.length - 1];

  // Detect existing page stored previously as full path (legacy) and migrate it.
  const legacyFull = await prisma.page.findUnique({ where: { slug_locale: { slug: fullSlug, locale: LOCALE } } });
  const existingLeaf = await prisma.page.findUnique({ where: { slug_locale: { slug: leafSlug, locale: LOCALE } }, include: { currentVersion: true } });

  // If we have a legacy full-path page and no leaf yet, transform it in-place.
  if (legacyFull && !existingLeaf) {
    const title = deriveTitle(val.normalized, fullSlug, leafSlug);
    const version = await getNextVersion(legacyFull.id);
    const pv = await prisma.pageVersion.create({ data: { pageId: legacyFull.id, version, title, published: true, blocks: val.normalized as any } });
    await prisma.page.update({ where: { id: legacyFull.id }, data: { slug: leafSlug, parentId, title, navLabel: title, kind: "PAGE", blocks: val.normalized as any, currentVersionId: pv.id, published: true } });
    return { id: legacyFull.id, created: false };
  }

  const page = existingLeaf;
  const title = deriveTitle(val.normalized, fullSlug, leafSlug);
  if (!page) {
    const created = await prisma.page.create({ data: { slug: leafSlug, locale: LOCALE, title, navLabel: title, parentId, published: true, kind: "PAGE", blocks: val.normalized as any, order: 0, visible: true }, select: { id: true } });
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

function beautifySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function deriveTitle(blocks: BlockInstance[], fullSlug: string, leafSlug: string): string {
  const clean = (s: string) => s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // strip markdown links
    .replace(/^"+|"+$/g, '')
    .trim();

  // 1) Explicit overrides by full path or special keys (e.g., home)
  const override = PAGE_LABELS[fullSlug] ?? PAGE_LABELS[leafSlug];
  if (override) return override;

  // 2) Try to infer from content blocks
  for (const b of blocks) {
    if (b.type === "Hero" && typeof b.props?.heading === "string" && b.props.heading) return clean(b.props.heading as string);
    if (b.type === "Section" && typeof b.props?.title === "string" && b.props.title) return clean(b.props.title as string);
  }

  // 3) Beautify the slug as a fallback
  return beautifySlug(leafSlug || fullSlug) || "Untitled";
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
      const res = await upsertPage(page);
      console.log(`✓ ${page.slug || 'home'} -> ${res.id} ${res.created ? '(created)' : '(version+)'} `);
    } catch (err) {
      console.error(`✗ ${page.slug || 'home'} error`, err);
    }
  }
  console.log("Done.");
}

run().catch(err => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
