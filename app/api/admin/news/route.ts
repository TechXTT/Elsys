import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import fs from "fs/promises";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getNewsFilePath, getNewsMarkdownPath, loadNewsJson } from "@/lib/content";
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
        action: "news.create.denied",
        entity: "news",
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
        action: "news.create.payload.error",
        entity: "news",
      });
    } catch {}
    return NextResponse.json({ error: "Невалидно тяло на заявката" }, { status: 400 });
  }

  const titleValue = form.get("title");
  const slugValue = form.get("slug");
  const excerptValue = form.get("excerpt");
  const markdownValue = form.get("markdown");
  const dateValue = form.get("date");
  const imagesMetaValue = form.get("imageMeta");
  const featuredImageValue = form.get("featuredImage");
  const imageEntries = form.getAll("images");

  const normalizedTitle = typeof titleValue === "string" ? titleValue.trim() : "";
  const slugSource = typeof slugValue === "string" && slugValue.trim().length > 0 ? slugValue : normalizedTitle;
  const normalizedSlug = slugify(slugSource);
  const trimmedExcerpt = typeof excerptValue === "string" && excerptValue.trim().length > 0 ? excerptValue.trim() : undefined;
  const markdown = typeof markdownValue === "string" ? markdownValue.trim() : "";

  if (!normalizedTitle) {
    try {
      await recordAudit({ req, userId: (session.user as any)?.id as string | undefined, action: "news.create.validation.title", entity: "news" });
    } catch {}
    return NextResponse.json({ error: "Заглавието е задължително" }, { status: 400 });
  }

  if (!normalizedSlug) {
    try {
      await recordAudit({ req, userId: (session.user as any)?.id as string | undefined, action: "news.create.validation.slug", entity: "news" });
    } catch {}
    return NextResponse.json({ error: "Слагът е задължителен" }, { status: 400 });
  }

  if (markdown.length === 0) {
    try {
      await recordAudit({ req, userId: (session.user as any)?.id as string | undefined, action: "news.create.validation.markdown", entity: "news" });
    } catch {}
    return NextResponse.json({ error: "Markdown съдържанието е задължително" }, { status: 400 });
  }

  const when = typeof dateValue === "string" && dateValue.length > 0 ? new Date(dateValue) : new Date();
  const safeDate = Number.isNaN(when.getTime()) ? new Date() : when;

  const existing = loadNewsJson();
  const duplicate = existing.find((item) => item.id === normalizedSlug || item.href.endsWith(`/${normalizedSlug}`));
  if (duplicate) {
    try {
      await recordAudit({
        req,
        userId: (session.user as any)?.id as string | undefined,
        action: "news.create.duplicate",
        entity: "news",
        entityId: normalizedSlug,
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
          action: "news.create.meta.error",
          entity: "news",
          entityId: normalizedSlug,
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
        action: "news.create.featured.invalid",
        entity: "news",
        entityId: normalizedSlug,
        details: { requestedFeaturedName },
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
            action: "news.create.imageUpload.error",
            entity: "news",
            entityId: normalizedSlug,
            details: { blobPath },
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

  const newPost: PostItem = {
    id: normalizedSlug,
    title: normalizedTitle,
    excerpt: trimmedExcerpt,
    href: `/novini/${normalizedSlug}`,
    date: safeDate.toISOString(),
    image: featuredImage?.url ?? finalImagesMeta[0]?.url,
    images: finalImagesMeta,
  };

  const nextPosts = [newPost, ...existing];

  try {
    const targetPath = getNewsFilePath();
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, `${JSON.stringify(nextPosts, null, 2)}\n`, { encoding: "utf8" });

    const markdownPath = getNewsMarkdownPath(normalizedSlug);
    await fs.mkdir(path.dirname(markdownPath), { recursive: true });
    await fs.writeFile(markdownPath, `${markdown}\n`, { encoding: "utf8" });
  } catch (error) {
    console.error("News create write error", error);
    try {
      await recordAudit({
        req,
        userId: (session.user as any)?.id as string | undefined,
        action: "news.create.write.error",
        entity: "news",
        entityId: normalizedSlug,
      });
    } catch {}
    return NextResponse.json({ error: "Неуспешно записване" }, { status: 500 });
  }

  try {
    await recordAudit({
      req,
      userId: (session.user as any)?.id as string | undefined,
      action: "news.create",
      entity: "news",
      entityId: normalizedSlug,
      details: { title: normalizedTitle, images: finalImagesMeta.length },
    });
  } catch {}

  return NextResponse.json({ post: newPost });
}
