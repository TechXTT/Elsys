import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import path from "path";
import { authOptions } from "@/lib/auth";
import { defaultLocale } from "@/i18n/config";
import { createNewsPost as dbCreateNewsPost, existsNewsSlug as dbExistsNewsSlug, getNewsPosts } from "@/lib/news";
import { recordAudit } from "@/lib/audit";
import type { PostItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    try {
      await recordAudit({ req, action: "newsPost.list.denied", entity: "newsPost" });
    } catch {}
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const url = new URL(req.url);
  const localeParam = url.searchParams.get("locale");
  const locale = localeParam === "bg" || localeParam === "en" ? localeParam : defaultLocale;
  // Always include drafts for admin listing
  let posts: any[] = [];
  try {
    posts = await getNewsPosts(locale, true);
  } catch (error) {
    console.error("News list fetch error", error);
    try {
      await recordAudit({ req, userId: (session.user as any)?.id as string | undefined, action: "newsPost.list.error", entity: "newsPost", details: { locale } });
    } catch {}
    return NextResponse.json({ error: "Грешка при зареждане" }, { status: 500 });
  }

  try {
    await recordAudit({ req, userId: (session.user as any)?.id as string | undefined, action: "newsPost.list", entity: "newsPost", details: { locale, count: posts.length } });
  } catch {}

  return NextResponse.json({ posts });
}

type ImageSize = NonNullable<PostItem["images"]>[number]["size"];
type ImageOrigin = "new" | "existing";

interface DeclaredImageMeta {
  name: string;
  size?: ImageSize;
  origin?: ImageOrigin;
  url?: string;
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u0000-\u001F\u007F]+/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u0400-\u04FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureUniqueImageName(name: string, used: Set<string>): string {
  const ext = path.extname(name).toLowerCase();
  const base = slugify(path.basename(name, ext));
  const cleanBase = base || "image";
  let candidate = `${cleanBase}${ext}`;
  let counter = 1;
  while (used.has(candidate)) {
    candidate = `${cleanBase}-${counter}${ext}`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    try {
      await recordAudit({
        req,
        action: "newsPost.create.denied",
        entity: "newsPost",
      });
    } catch {}
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (error) {
    console.error("News create payload error", error);
    try {
      await recordAudit({
        req,
        userId: (session.user as any)?.id as string | undefined,
        action: "newsPost.create.payload.error",
        entity: "newsPost",
      });
    } catch {}
    return NextResponse.json({ error: "Невалидно тяло на заявката" }, { status: 400 });
  }

  const titleValue = form.get("title");
  const slugValue = form.get("slug");
  const excerptValue = form.get("excerpt");
  const markdownValue = form.get("markdown");
  const blocksJsonValue = form.get("blocksJson");
  const useBlocksValue = form.get("useBlocks");
  const dateValue = form.get("date");
  const imagesMetaValue = form.get("imageMeta");
  const featuredImageValue = form.get("featuredImage");
  const publishedValue = form.get("published");
  const localeValue = form.get("locale");
  const imageEntries = form.getAll("images");

  const normalizedTitle = typeof titleValue === "string" ? titleValue.trim() : "";
  const slugSource = typeof slugValue === "string" && slugValue.trim().length > 0 ? slugValue : normalizedTitle;
  const normalizedSlug = slugify(slugSource);
  const trimmedExcerpt = typeof excerptValue === "string" && excerptValue.trim().length > 0 ? excerptValue.trim() : undefined;
  const markdown = typeof markdownValue === "string" ? markdownValue.trim() : "";
  const useBlocks = useBlocksValue === "true";

  // Parse blocks JSON if provided
  let blocks: unknown[] | null = null;
  if (typeof blocksJsonValue === "string" && blocksJsonValue.trim().length > 0) {
    try {
      const parsed = JSON.parse(blocksJsonValue);
      if (Array.isArray(parsed)) {
        blocks = parsed;
      }
    } catch (error) {
      console.error("News create blocks parse error", error);
    }
  }

  if (!normalizedTitle) {
    try {
      await recordAudit({ req, userId: (session.user as any)?.id as string | undefined, action: "newsPost.create.validation.title", entity: "newsPost" });
    } catch {}
    return NextResponse.json({ error: "Заглавието е задължително" }, { status: 400 });
  }

  if (!normalizedSlug) {
    try {
      await recordAudit({ req, userId: (session.user as any)?.id as string | undefined, action: "newsPost.create.validation.slug", entity: "newsPost" });
    } catch {}
    return NextResponse.json({ error: "Слагът е задължителен" }, { status: 400 });
  }

  if (markdown.length === 0) {
    try {
      await recordAudit({ req, userId: (session.user as any)?.id as string | undefined, action: "newsPost.create.validation.markdown", entity: "newsPost" });
    } catch {}
    return NextResponse.json({ error: "Markdown съдържанието е задължително" }, { status: 400 });
  }

  const when = typeof dateValue === "string" && dateValue.length > 0 ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(when.getTime()) ? new Date() : when;
  const locale = (typeof localeValue === "string" && (localeValue === "bg" || localeValue === "en")) ? (localeValue as "bg" | "en") : defaultLocale;
  const published = publishedValue === "false" ? false : true;

  const duplicate = await dbExistsNewsSlug(normalizedSlug, defaultLocale);
  if (duplicate) {
    try {
      await recordAudit({
        req,
        userId: (session.user as any)?.id as string | undefined,
        action: "newsPost.create.duplicate",
        entity: "newsPost",
        entityId: normalizedSlug,
        details: { locale },
      });
    } catch {}
    return NextResponse.json({ error: "Новина с такъв слаг вече съществува" }, { status: 409 });
  }

  const requestedFeaturedName =
    typeof featuredImageValue === "string" && featuredImageValue.trim().length > 0 ? featuredImageValue.trim() : undefined;

  let declaredMeta: DeclaredImageMeta[] = [];
  if (typeof imagesMetaValue === "string" && imagesMetaValue.trim().length > 0) {
    try {
      const parsed = JSON.parse(imagesMetaValue);
      if (Array.isArray(parsed)) {
        declaredMeta = parsed.filter((item) => typeof item?.name === "string").map((item) => ({
          name: String(item.name),
          size: (item.size === "small" || item.size === "medium" || item.size === "large" || item.size === "full") ? item.size : undefined,
          origin: item.origin === "existing" ? "existing" : "new",
          url: typeof item.url === "string" ? item.url : undefined,
        }));
      }
    } catch (error) {
      console.error("News image meta parse error", error);
      try {
        await recordAudit({
          req,
          userId: (session.user as any)?.id as string | undefined,
          action: "newsPost.create.meta.error",
          entity: "newsPost",
          entityId: normalizedSlug,
          details: { locale },
        });
      } catch {}
      return NextResponse.json({ error: "Невалидни данни за изображения" }, { status: 400 });
    }
  }

  const metaByName = new Map(declaredMeta.map((item) => [item.name, item] as const));

  if (requestedFeaturedName && !metaByName.has(requestedFeaturedName)) {
    try {
      await recordAudit({
        req,
        userId: (session.user as any)?.id as string | undefined,
        action: "newsPost.create.featured.invalid",
        entity: "newsPost",
        entityId: normalizedSlug,
        details: { requestedFeaturedName, locale },
      });
    } catch {}
    return NextResponse.json({ error: "Невалидно основно изображение" }, { status: 400 });
  }

  const imagesMeta: NonNullable<PostItem["images"]> = [];
  const usedNames = new Set<string>();
  if (imageEntries.length > 0) {
    for (const entry of imageEntries) {
      if (!(entry instanceof File) || entry.size === 0) continue;

      const providedName = entry.name;
      const sanitizedName = ensureUniqueImageName(providedName, usedNames);
      const declared = metaByName.get(providedName) ?? metaByName.get(sanitizedName);
      const arrayBuffer = await entry.arrayBuffer();
      const blobPath = `news/${normalizedSlug}/${sanitizedName}`;
      try {
        const { url } = await put(blobPath, Buffer.from(arrayBuffer), {
          access: "public",
          contentType: entry.type || "application/octet-stream",
        });
        imagesMeta.push({
          name: sanitizedName,
          url,
          size: declared?.size ?? "full",
        });
      } catch (error) {
        console.error("News image upload error", error);
        try {
          await recordAudit({
            req,
            userId: (session.user as any)?.id as string | undefined,
            action: "newsPost.create.imageUpload.error",
            entity: "newsPost",
            entityId: normalizedSlug,
            details: { blobPath, locale },
          });
        } catch {}
        return NextResponse.json({ error: "Качването на изображение се провали" }, { status: 500 });
      }
    }
  }

  const orderedImagesMeta = declaredMeta
    .map((meta) => imagesMeta.find((img) => img.name === meta.name) ?? null)
    .filter((img): img is NonNullable<typeof img> => Boolean(img));

  const finalImagesMeta = orderedImagesMeta.length === imagesMeta.length ? orderedImagesMeta : imagesMeta;

  const featuredImage = requestedFeaturedName
    ? finalImagesMeta.find((img) => img.name === requestedFeaturedName) ?? null
    : null;

  let newPost: PostItem;
  try {
    newPost = await dbCreateNewsPost({
      slug: normalizedSlug,
      locale,
      title: normalizedTitle,
      excerpt: trimmedExcerpt,
      markdown,
      blocks,
      useBlocks,
      date: safeDate,
      images: finalImagesMeta,
      featuredImage: featuredImage?.url ?? finalImagesMeta[0]?.url ?? null,
      authorId: (session.user as any)?.id as string | undefined,
      published,
    });
  } catch (error) {
    console.error("News create DB error", error);
    try {
      await recordAudit({
        req,
        userId: (session.user as any)?.id as string | undefined,
        action: "newsPost.create.write.error",
        entity: "newsPost",
        entityId: normalizedSlug,
        details: { locale },
      });
    } catch {}
    return NextResponse.json({ error: "Неуспешно записване" }, { status: 500 });
  }

  try {
    await recordAudit({
      req,
      userId: (session.user as any)?.id as string | undefined,
      action: "newsPost.create",
      entity: "newsPost",
      entityId: normalizedSlug,
      details: { title: normalizedTitle, images: finalImagesMeta.length, locale, published },
    });
  } catch {}

  return NextResponse.json({ post: newPost });
}
