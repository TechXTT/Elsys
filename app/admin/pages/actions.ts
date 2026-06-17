"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { isDeeplConfigured, translateText, translateBlocks } from "@/lib/deepl";
import { invalidatePageCache } from "@/lib/cms/compile";
import { invalidateNavigationCache } from "@/lib/navigation-cache";
import { invalidateNavigationTree } from "@/lib/navigation-build";
import { revalidatePublicPages } from "@/lib/revalidate";
import { bumpCacheVersion } from "@/lib/cache";
import { requirePermission } from "@/lib/auth/guard";
import { revalidatePath } from "next/cache";

export interface TranslateResult {
  ok: boolean;
  error?: "unauthorized" | "not_configured" | "no_source" | "excluded" | "reviewed_exists" | "failed";
  message?: string;
  chars?: number;
}

// Human-only legal pages — never machine-translated (J item 4).
const LEGAL_SLUGS = new Set(["poveritelnost", "biskvitki", "dostapnost"]);

export type InlineEditResult = { ok: true } | { ok: false; error: string };

/**
 * Inline block edit (G3-3, Figma 110:3). Admin-only edit of a single block's
 * primary text on a public page, from the inline drawer. Maps the generic
 * title/content onto the block's prop names by type, updates the page's blocks
 * JSON, audits, and revalidates both locales of the page path.
 */
export async function inlineUpdatePageBlock(
  pageId: string,
  index: number,
  title: string,
  content: string
): Promise<InlineEditResult> {
  const userId = await requirePermission("pages:edit");
  const page = await (prisma as any).page.findUnique({
    where: { id: pageId },
    select: { id: true, slug: true, locale: true, blocks: true },
  });
  if (!page) return { ok: false, error: "Страницата не е намерена." };
  const blocks = Array.isArray(page.blocks) ? [...page.blocks] : [];
  const b = blocks[index];
  if (!b || typeof b !== "object") return { ok: false, error: "Блокът не е намерен." };

  const props = { ...(b.props ?? {}) } as Record<string, unknown>;
  switch (b.type) {
    case "Hero":
      props.heading = title; props.subheading = content; break;
    case "Section":
      props.title = title; props.markdown = content; break;
    case "Markdown":
      props.markdown = content; break;
    default:
      props.title = title; props.content = content;
  }
  blocks[index] = { ...b, props };

  await (prisma as any).page.update({ where: { id: pageId }, data: { blocks: blocks as any } });

  await recordAudit({
    ...(await auditMeta()),
    userId,
    action: "page.block.inlineEdit",
    entity: "Page",
    entityId: pageId,
    details: { index, type: b.type, slug: page.slug, locale: page.locale },
  });

  invalidatePageCache(page.slug, page.locale);
  for (const loc of ["bg", "en"]) revalidatePath(`/${loc}/${page.slug}`);
  return { ok: true };
}

async function adminId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as any)?.id as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;
  return id && role === "ADMIN" ? id : null;
}

async function auditMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent") ?? null,
  };
}

/**
 * Fill the EN page from its BG source via DeepL and save it as a needs-review
 * DRAFT (machineTranslated=true) — never auto-published. Legal pages are
 * excluded. Refreshes an existing unreviewed machine draft; refuses to clobber a
 * human-reviewed EN row.
 */
export async function translatePageToEn(pageId: string): Promise<TranslateResult> {
  const userId = await adminId();
  if (!userId) return { ok: false, error: "unauthorized" };
  if (!isDeeplConfigured())
    return { ok: false, error: "not_configured", message: "DeepL не е конфигуриран (липсва DEEPL_API_KEY)." };

  const src = await (prisma as any).page.findUnique({ where: { id: pageId } });
  if (!src) return { ok: false, error: "no_source", message: "Страницата не е намерена." };
  if (src.locale !== "bg") return { ok: false, error: "no_source", message: "Преводът се стартира от българския вариант." };
  if (LEGAL_SLUGS.has(src.slug))
    return { ok: false, error: "excluded", message: "Правните страници се превеждат само от човек и са изключени от машинния превод." };

  const existing = await (prisma as any).page.findUnique({
    where: { slug_locale: { slug: src.slug, locale: "en" } },
    select: { machineTranslated: true },
  });
  if (existing && existing.machineTranslated === false)
    return { ok: false, error: "reviewed_exists", message: "Английската версия вече е прегледана — преводът е пропуснат, за да не се изгуби ръчната редакция." };

  try {
    const [title, excerpt, markdown, blk] = await Promise.all([
      translateText(src.title, { source: "bg", target: "en" }),
      src.excerpt ? translateText(src.excerpt, { source: "bg", target: "en" }) : Promise.resolve({ text: null as string | null, chars: 0 }),
      src.bodyMarkdown ? translateText(src.bodyMarkdown, { source: "bg", target: "en" }) : Promise.resolve({ text: null as string | null, chars: 0 }),
      translateBlocks(src.blocks, { source: "bg", target: "en" }),
    ]);
    const chars = title.chars + excerpt.chars + markdown.chars + blk.chars;

    const data = {
      title: title.text,
      excerpt: excerpt.text,
      bodyMarkdown: markdown.text,
      blocks: blk.blocks as any,
      kind: src.kind,
      published: false,
      status: "DRAFT" as const,
      machineTranslated: true,
      authorId: userId,
    };
    await (prisma as any).page.upsert({
      where: { slug_locale: { slug: src.slug, locale: "en" } },
      create: { slug: src.slug, locale: "en", groupId: src.groupId ?? src.id, ...data },
      update: data,
    });

    await recordAudit({
      ...(await auditMeta()),
      userId,
      action: "page.translate.en",
      entity: "Page",
      entityId: pageId,
      details: { provider: "deepl", chars, slug: src.slug, source: "bg", target: "en" },
    });

    try {
      invalidatePageCache(src.slug, "en");
      invalidateNavigationCache();
      await invalidateNavigationTree();
      await bumpCacheVersion("routes");
      await revalidatePublicPages();
    } catch (e) {
      console.error("translatePageToEn revalidation failed", e);
    }
    return { ok: true, chars };
  } catch (err) {
    console.error("translatePageToEn failed", err);
    await recordAudit({
      ...(await auditMeta()),
      userId,
      action: "page.translate.en.error",
      entity: "Page",
      entityId: pageId,
      details: { provider: "deepl", message: String(err) },
    }).catch(() => {});
    return { ok: false, error: "failed", message: "Грешка при превода. Опитайте отново." };
  }
}
