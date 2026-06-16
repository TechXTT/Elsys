"use server";

import { headers } from "next/headers";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { isDeeplConfigured, translateText, translateBlocks } from "@/lib/deepl";
import { invalidateNewsCache, revalidateNews } from "@/lib/news";

export interface TranslateResult {
  ok: boolean;
  error?: "unauthorized" | "not_configured" | "no_source" | "reviewed_exists" | "failed";
  message?: string;
  chars?: number;
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
 * Fill the EN article from its BG source via DeepL and save it as a needs-review
 * DRAFT (machineTranslated=true) — never auto-published. Refreshes an existing
 * unreviewed machine draft, but refuses to clobber a human-reviewed EN row.
 */
export async function translateNewsToEn(slug: string): Promise<TranslateResult> {
  const userId = await adminId();
  if (!userId) return { ok: false, error: "unauthorized" };
  if (!isDeeplConfigured())
    return { ok: false, error: "not_configured", message: "DeepL не е конфигуриран (липсва DEEPL_API_KEY)." };

  const src = await (prisma as any).newsPost.findUnique({ where: { id_locale: { id: slug, locale: "bg" } } });
  if (!src) return { ok: false, error: "no_source", message: "Липсва български източник за тази новина." };

  const existing = await (prisma as any).newsPost.findUnique({
    where: { id_locale: { id: slug, locale: "en" } },
    select: { machineTranslated: true },
  });
  if (existing && existing.machineTranslated === false)
    return { ok: false, error: "reviewed_exists", message: "Английската версия вече е прегледана — преводът е пропуснат, за да не се изгуби ръчната редакция." };

  try {
    const [title, excerpt, markdown, blk] = await Promise.all([
      translateText(src.title, { source: "bg", target: "en" }),
      src.excerpt ? translateText(src.excerpt, { source: "bg", target: "en" }) : Promise.resolve({ text: null as string | null, chars: 0 }),
      src.bodyMarkdown ? translateText(src.bodyMarkdown, { source: "bg", target: "en" }) : Promise.resolve({ text: "", chars: 0 }),
      translateBlocks(src.blocks, { source: "bg", target: "en" }),
    ]);
    const chars = title.chars + excerpt.chars + markdown.chars + blk.chars;

    const data = {
      title: title.text,
      excerpt: excerpt.text,
      bodyMarkdown: markdown.text,
      blocks: blk.blocks as any,
      useBlocks: src.useBlocks,
      date: src.date,
      images: src.images,
      featuredImage: src.featuredImage,
      category: src.category,
      colorTag: src.colorTag,
      published: false,
      status: "DRAFT" as const,
      machineTranslated: true,
      authorId: userId,
    };
    await (prisma as any).newsPost.upsert({
      where: { id_locale: { id: slug, locale: "en" } },
      create: { id: slug, locale: "en", ...data },
      update: data,
    });

    await recordAudit({
      ...(await auditMeta()),
      userId,
      action: "newsPost.translate.en",
      entity: "newsPost",
      entityId: slug,
      details: { provider: "deepl", chars, source: "bg", target: "en" },
    });

    await invalidateNewsCache();
    await revalidateNews([slug]);
    return { ok: true, chars };
  } catch (err) {
    console.error("translateNewsToEn failed", err);
    await recordAudit({
      ...(await auditMeta()),
      userId,
      action: "newsPost.translate.en.error",
      entity: "newsPost",
      entityId: slug,
      details: { provider: "deepl", message: String(err) },
    }).catch(() => {});
    return { ok: false, error: "failed", message: "Грешка при превода. Опитайте отново." };
  }
}
