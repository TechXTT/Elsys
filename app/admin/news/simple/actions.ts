"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { defaultLocale, type Locale } from "@/i18n/config";
import {
  createNewsPost,
  updateNewsPost,
  existsNewsSlug,
  revalidateNews,
} from "@/lib/news";

export type SimpleNewsState =
  | { ok: true; slug: string }
  | { ok: false; errors: Record<string, string> }
  | null;

const COLOR_VALUES = ["RED", "ORANGE", "YELLOW", "GREEN", "TEAL", "BLUE", "INDIGO", "PURPLE", "PINK", "GRAY"] as const;

const schema = z.object({
  title: z.string().min(2, "Заглавието трябва да е поне 2 символа."),
  excerpt: z.string().optional(),
  body: z.string().optional(),
  date: z.string().min(1, "Изберете дата."),
  visibility: z.enum(["PUBLISHED", "DRAFT"]),
  colorTag: z.enum(COLOR_VALUES).optional().or(z.literal("")),
  categoryPageId: z.string().optional().or(z.literal("")),
  featuredImage: z.string().optional().or(z.literal("")),
  gallery: z.string().optional(), // JSON array of image urls
});

/**
 * Simple Mode news save (G3-1). Server Action — no REST. Creates or updates a
 * news post from the one-screen Sweboo-parity form. Body is markdown (curated
 * toolbar via RichTextEditor); TipTap swap is a separate migration (flagged).
 */
export async function saveSimpleNews(
  _prev: SimpleNewsState,
  formData: FormData
): Promise<SimpleNewsState> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Unauthorized");

  const locale = ((formData.get("locale") as string) || defaultLocale) as Locale;
  const editingSlug = (formData.get("editingSlug") as string) || "";

  const parsed = schema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt") ?? undefined,
    body: formData.get("body") ?? undefined,
    date: formData.get("date"),
    visibility: formData.get("visibility"),
    colorTag: formData.get("colorTag") ?? undefined,
    categoryPageId: formData.get("categoryPageId") ?? undefined,
    featuredImage: formData.get("featuredImage") ?? undefined,
    gallery: formData.get("gallery") ?? undefined,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[i.path.join(".") || "_form"] = i.message;
    return { ok: false, errors };
  }
  const d = parsed.data;

  // Parse gallery JSON (array of urls) into the images meta shape.
  let images: { name: string; url: string; size: "full" }[] | undefined;
  try {
    const urls = d.gallery ? (JSON.parse(d.gallery) as string[]) : [];
    images = urls.filter(Boolean).map((url, i) => ({ name: `image-${i + 1}`, url, size: "full" as const }));
  } catch {
    images = undefined;
  }

  const published = d.visibility === "PUBLISHED";
  const date = new Date(d.date);

  // Slug: keep on edit; derive from title on create (ensure unique).
  let slug = editingSlug || slugify(d.title);
  if (!editingSlug) {
    let candidate = slug || `post-${Date.now()}`;
    let n = 2;
    while (await existsNewsSlug(candidate, locale)) candidate = `${slug}-${n++}`;
    slug = candidate;
  }

  const base = {
    locale,
    title: d.title,
    excerpt: d.excerpt || undefined,
    markdown: d.body || "",
    date,
    images,
    featuredImage: d.featuredImage || null,
    authorId: userId,
    published,
  };

  if (editingSlug) {
    await updateNewsPost({ currentSlug: editingSlug, slug, ...base });
  } else {
    await createNewsPost({ slug, ...base });
  }

  // colorTag + categoryPage are not handled by create/updateNewsPost — set them
  // directly (no extra version snapshot needed).
  await prisma.newsPost.update({
    where: { id_locale: { id: slug, locale } },
    data: {
      colorTag: d.colorTag ? (d.colorTag as (typeof COLOR_VALUES)[number]) : null,
      categoryPageId: d.categoryPageId || null,
    },
  });

  await recordAudit({
    userId,
    action: editingSlug ? "NEWS_SIMPLE_UPDATE" : "NEWS_SIMPLE_CREATE",
    entity: "NewsPost",
    entityId: slug,
    details: { locale, published },
  });

  await revalidateNews([slug]);
  return { ok: true, slug };
}
