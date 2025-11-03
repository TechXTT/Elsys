import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getNewsFilePath, getNewsMarkdownPath, loadNewsJson, loadNewsMarkdown } from "@/lib/content";
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
      await recordAudit({ req: request, action: "news.open.denied", entity: "news", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  const posts = loadNewsJson();
  const post = posts.find((item) => item.id === params.id);
  if (!post) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.open.notfound", entity: "news", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Публикацията не е намерена" }, { status: 404 });
  }

  const markdown = loadNewsMarkdown(post.id) ?? "";
  try {
    await recordAudit({
      req: request,
      userId: (session.user as any)?.id as string | undefined,
      action: "news.open",
      entity: "news",
      entityId: post.id,
    });
  } catch {}
  return NextResponse.json({ post, markdown });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    try {
      await recordAudit({ req: request, action: "news.update.denied", entity: "news", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Неоторизиран достъп" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("News update payload error", error);
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.payload.error", entity: "news", entityId: params.id });
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
  const imageEntries = form.getAll("images");

  const normalizedTitle = typeof titleValue === "string" ? titleValue.trim() : "";
  const slugSource = typeof slugValue === "string" && slugValue.trim().length > 0 ? slugValue : normalizedTitle;
  const normalizedSlug = slugify(slugSource);
  const trimmedExcerpt = typeof excerptValue === "string" && excerptValue.trim().length > 0 ? excerptValue.trim() : undefined;
  const markdown = typeof markdownValue === "string" ? markdownValue.trim() : "";

  if (!normalizedTitle) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.validation.title", entity: "news", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Заглавието е задължително" }, { status: 400 });
  }

  if (!normalizedSlug) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.validation.slug", entity: "news", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Слагът е задължителен" }, { status: 400 });
  }

  if (markdown.length === 0) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.validation.markdown", entity: "news", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Markdown съдържанието е задължително" }, { status: 400 });
  }

  const posts = loadNewsJson();
  const targetIndex = posts.findIndex((item) => item.id === params.id);
  if (targetIndex === -1) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.notfound", entity: "news", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Публикацията не е намерена" }, { status: 404 });
  }

  const duplicate = posts.some((item) => item.id === normalizedSlug && item.id !== params.id);
  if (duplicate) {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.duplicate", entity: "news", entityId: normalizedSlug, details: { fromId: params.id } });
    } catch {}
    return NextResponse.json({ error: "Новина с такъв слаг вече съществува" }, { status: 409 });
  }

  let declaredMeta: DeclaredImageMeta[] = [];
  try {
    declaredMeta = parseDeclaredMeta(imageMetaValue);
  } catch {
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.meta.error", entity: "news", entityId: params.id });
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
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.featured.invalid", entity: "news", entityId: params.id, details: { requestedFeaturedName } });
    } catch {}
    return NextResponse.json({ error: "Невалидно основно изображение" }, { status: 400 });
  }

  const existingPost = posts[targetIndex];
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
          await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.missingExistingImage", entity: "news", entityId: params.id, details: { name: meta.name } });
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
        await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.missingFile", entity: "news", entityId: params.id, details: { name: meta.name } });
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
        await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.imageUpload.error", entity: "news", entityId: params.id, details: { blobPath, name: meta.name } });
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

  const updatedPost: PostItem = {
    ...existingPost,
    id: normalizedSlug,
    title: normalizedTitle,
    excerpt: trimmedExcerpt,
    href: `/novini/${normalizedSlug}`,
    date: safeDate.toISOString(),
    image:
      (requestedFeaturedName ? nextImages.find((img) => img.name === requestedFeaturedName)?.url : undefined) ??
      (existingPost.image ? nextImages.find((img) => img.url === existingPost.image)?.url : undefined) ??
      nextImages[0]?.url,
    images: nextImages,
  };

  const nextPosts = posts.map((item, index) => (index === targetIndex ? updatedPost : item));

  try {
    const targetPath = getNewsFilePath();
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, `${JSON.stringify(nextPosts, null, 2)}\n`, { encoding: "utf8" });

    const markdownPath = getNewsMarkdownPath(normalizedSlug);
    await fs.mkdir(path.dirname(markdownPath), { recursive: true });
    await fs.writeFile(markdownPath, `${markdown}\n`, { encoding: "utf8" });

    if (normalizedSlug !== params.id) {
      const oldMarkdownPath = getNewsMarkdownPath(params.id);
      try {
        await fs.unlink(oldMarkdownPath);
      } catch (error) {
        const typed = error as NodeJS.ErrnoException;
        if (typed.code !== "ENOENT") {
          console.error("News markdown cleanup error", error);
        }
      }
    }
  } catch (error) {
    console.error("News update write error", error);
    try {
      await recordAudit({ req: request, userId: (session.user as any)?.id as string | undefined, action: "news.update.write.error", entity: "news", entityId: params.id });
    } catch {}
    return NextResponse.json({ error: "Неуспешно записване" }, { status: 500 });
  }

  try {
    await recordAudit({
      req: request,
      userId: (session.user as any)?.id as string | undefined,
      action: "news.update",
      entity: "news",
      entityId: updatedPost.id,
      details: { fromId: params.id, toId: updatedPost.id, title: updatedPost.title },
    });
  } catch {}
  return NextResponse.json({ post: updatedPost });
}
