import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { defaultLocale } from "@/i18n/config";
import { getNewsPost as dbGetNewsPost, updateNewsPost as dbUpdateNewsPost } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import type { PostItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function parseDeclaredMeta(value: FormDataEntryValue | null): DeclaredImageMeta[] {
  if (typeof value !== "string" || value.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => typeof item?.name === "string")
      .map((item) => ({
        name: String(item.name),
        size: item.size === "small" || item.size === "medium" || item.size === "large" || item.size === "full" ? item.size : undefined,
        origin: item.origin === "existing" ? "existing" : "new",
        url: typeof item.url === "string" ? item.url : undefined,
      }));
  } catch (error) {
    console.error("News update meta parse error", error);
    throw new Error("invalid-meta");
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    try {
      await recordAudit({ req: request, action: "newsPost.open.denied", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const locale = localeParam === "bg" || localeParam === "en" ? localeParam : defaultLocale;

  const db = await dbGetNewsPost(params.id, locale, true);
  if (!db) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.open.notfound", entity: "newsPost", entityId: params.id, details: { locale } });
    } catch {}
    return NextResponse.json({ error: "Публикацията не е намерена" }, { status: 404 });
  }

  const { post, markdown, published } = db;
  try {
    await recordAudit({
      req: request,
      userId: (session.user as any)?.id as string | undefined,
      action: "newsPost.open",
      entity: "newsPost",
      entityId: post.id,
      details: { locale },
    });
  } catch {}
  return NextResponse.json({ post, markdown, published });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    try {
      await recordAudit({ req: request, action: "newsPost.update.denied", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("News update payload error", error);
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.payload.error", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Невалидно тяло на заявката" }, { status: 400 });
  }

  const titleValue = form.get("title");
  const slugValue = form.get("slug");
  const excerptValue = form.get("excerpt");
  const markdownValue = form.get("markdown");
  const dateValue = form.get("date");
  const imageMetaValue = form.get("imageMeta");
  const featuredImageValue = form.get("featuredImage");
  const publishedValue = form.get("published");
  const localeValue = form.get("locale");
  const imageEntries = form.getAll("images");

  const normalizedTitle = typeof titleValue === "string" ? titleValue.trim() : "";
  const slugSource = typeof slugValue === "string" && slugValue.trim().length > 0 ? slugValue : normalizedTitle;
  const normalizedSlug = slugify(slugSource);
  const trimmedExcerpt = typeof excerptValue === "string" && excerptValue.trim().length > 0 ? excerptValue.trim() : undefined;
  const markdown = typeof markdownValue === "string" ? markdownValue.trim() : "";

  if (!normalizedTitle) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.validation.title", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Заглавието е задължително" }, { status: 400 });
  }

  if (!normalizedSlug) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.validation.slug", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Слагът е задължителен" }, { status: 400 });
  }

  if (markdown.length === 0) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.validation.markdown", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Markdown съдържанието е задължително" }, { status: 400 });
  }

  const requestedLocale = typeof localeValue === "string" && (localeValue === "bg" || localeValue === "en") ? localeValue : defaultLocale;
  const current = await dbGetNewsPost(params.id, requestedLocale, true);
  if (!current) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.notfound", entity: "newsPost", entityId: params.id, details: { locale: requestedLocale } });
    } catch {}
    return NextResponse.json({ error: "Публикацията не е намерена" }, { status: 404 });
  }

  const duplicate = normalizedSlug !== params.id && (await dbGetNewsPost(normalizedSlug, requestedLocale, true)) !== null;
  if (duplicate) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.duplicate", entity: "newsPost", entityId: normalizedSlug, details: { fromId: params.id, locale: requestedLocale } });
    } catch {}
    return NextResponse.json({ error: "Новина с такъв слаг вече съществува" }, { status: 409 });
  }

  let declaredMeta: DeclaredImageMeta[] = [];
  try {
    declaredMeta = parseDeclaredMeta(imageMetaValue);
  } catch {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.meta.error", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Невалидни данни за изображения" }, { status: 400 });
  }

  const requestedFeaturedName =
    typeof featuredImageValue === "string" && featuredImageValue.trim().length > 0 ? featuredImageValue.trim() : undefined;

  const seenNames = new Set<string>();
  for (const meta of declaredMeta) {
    if (seenNames.has(meta.name)) {
      return NextResponse.json({ error: `Дублирано име на изображение: ${meta.name}` }, { status: 400 });
    }
    seenNames.add(meta.name);
  }

  if (requestedFeaturedName && !declaredMeta.some((meta) => meta.name === requestedFeaturedName)) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.featured.invalid", entity: "newsPost", entityId: params.id, details: { requestedFeaturedName } });
    } catch {}
    return NextResponse.json({ error: "Невалидно основно изображение" }, { status: 400 });
  }

  const existingPost = current.post;
  const existingImages = existingPost.images ?? [];
  const existingImageMap = new Map(existingImages.map((img) => [img.name, img] as const));

  const newFiles = imageEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const fileMap = new Map(newFiles.map((entry) => [entry.name, entry] as const));

  const nextImages: NonNullable<PostItem["images"]> = [];

  for (const meta of declaredMeta) {
    if (meta.origin === "existing") {
      const stored = existingImageMap.get(meta.name);
      if (!stored) {
        try {
          await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.missingExistingImage", entity: "newsPost", entityId: params.id, details: { name: meta.name } });
        } catch {}
        return NextResponse.json({ error: `Липсва съществуващо изображение: ${meta.name}` }, { status: 400 });
      }
      nextImages.push({
        name: meta.name,
        url: stored.url,
        size: meta.size ?? stored.size ?? "full",
      });
      continue;
    }

    const file = fileMap.get(meta.name);
    if (!file) {
      try {
        await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.missingFile", entity: "newsPost", entityId: params.id, details: { name: meta.name } });
      } catch {}
      return NextResponse.json({ error: `Липсва файл за изображение: ${meta.name}` }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const blobPath = `news/${normalizedSlug}/${meta.name}`;
    try {
      const { url } = await put(blobPath, Buffer.from(arrayBuffer), {
        access: "public",
        contentType: file.type || "application/octet-stream",
      });
      nextImages.push({
        name: meta.name,
        url,
        size: meta.size ?? "full",
      });
    } catch (error) {
      console.error("News image upload error", error);
      try {
        await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.imageUpload.error", entity: "newsPost", entityId: params.id, details: { blobPath, name: meta.name } });
      } catch {}
      return NextResponse.json({ error: "Качването на изображение се провали" }, { status: 500 });
    }
  }

  const when = typeof dateValue === "string" && dateValue.length > 0 ? new Date(dateValue) : null;
  const safeDate = when && !Number.isNaN(when.getTime())
    ? when
    : existingPost.date
    ? new Date(existingPost.date)
    : new Date();

  const featuredUrl =
    (requestedFeaturedName ? nextImages.find((img) => img.name === requestedFeaturedName)?.url : undefined) ??
    (existingPost.image ? nextImages.find((img) => img.url === existingPost.image)?.url : undefined) ??
    nextImages[0]?.url ?? null;

  const published = publishedValue === "false" ? false : true;
  let updatedPost: PostItem;
  try {
    updatedPost = await dbUpdateNewsPost({
      currentSlug: params.id,
      slug: normalizedSlug,
      locale: requestedLocale as any,
      title: normalizedTitle,
      excerpt: trimmedExcerpt,
      markdown,
      date: safeDate,
      images: nextImages,
      featuredImage: featuredUrl,
      authorId: (session.user as any)?.id as string | undefined,
      published,
    });
  } catch (error) {
    console.error("News update DB error", error);
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.update.write.error", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Неуспешно записване" }, { status: 500 });
  }

  try {
    await recordAudit({
      req: request,
      userId: (session.user as any)?.id as string | undefined,
      action: "newsPost.update",
      entity: "newsPost",
      entityId: updatedPost.id,
      details: { fromId: params.id, toId: updatedPost.id, title: updatedPost.title, locale: requestedLocale },
    });
  } catch {}
  return NextResponse.json({ post: updatedPost });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    try {
      await recordAudit({ req: request, action: "newsPost.delete.denied", entity: "newsPost", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const locale = localeParam === "bg" || localeParam === "en" ? localeParam : defaultLocale;

  try {
    await (prisma as any).newsPost.delete({ where: { id_locale: { id: params.id, locale } } });
  } catch (error) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.delete.notfound", entity: "newsPost", entityId: params.id, details: { locale } });
    } catch {}
    return NextResponse.json({ error: "Публикацията не е намерена" }, { status: 404 });
  }

  try {
    await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "newsPost.delete", entity: "newsPost", entityId: params.id, details: { locale } });
  } catch {}
  return NextResponse.json({ ok: true });
}
