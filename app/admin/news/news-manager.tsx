"use client";

import { type ChangeEvent, type ComponentPropsWithoutRef, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import type { PostItem } from "@/lib/types";

type Status = { type: "idle" } | { type: "loading" } | { type: "success"; message: string } | { type: "error"; message: string };

type ImageSize = "small" | "medium" | "large" | "full";

const imageSizeLabels: Record<ImageSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  full: "Full",
};

const imageSizeOptions: ImageSize[] = ["small", "medium", "large", "full"];

interface SelectedImage {
  file: File | null;
  preview: string;
  name: string;
  size: ImageSize;
  origin: "new" | "existing";
  url?: string;
}

interface Props {
  posts: PostItem[];
  currentLocale: string;
  onLocaleChange?: (locale: string) => void;
}

function slugify(input: string): string {
    return input
        .normalize("NFKD")
        .trim()
        .toLowerCase()
        // normalize various dash characters (en-dash, em-dash, figure dash, minus sign) to ASCII hyphen
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]+/g, "-")
        .replace(/[\u0000-\u001F\u007F]+/g, "")
        // replace any whitespace (spaces, tabs, NBSP, etc.) and underscores with a single hyphen
        .replace(/[\s_]+/g, "-")
        // remove any character that is not a-z, 0-9, Cyrillic range, or hyphen
        .replace(/[^a-z0-9\u0400-\u04FF-]+/g, "")
        // collapse multiple hyphens into one and trim leading/trailing hyphens
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function splitName(name: string) {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, dotIndex), ext: name.slice(dotIndex).toLowerCase() };
}

function formatDateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

function getTodayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function countWords(input: string): number {
  const words = input.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function estimateReadingMinutes(words: number): number {
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / 200));
}

function resolveInlineCode(
  inline: boolean | undefined,
  className: string | undefined,
  children: ReactNode,
  props: ComponentPropsWithoutRef<"code">,
) {
  if (inline) {
    return (
      <code
        className={`rounded bg-slate-100 px-1 py-0.5 font-mono text-sm dark:bg-slate-800 ${className ?? ""}`}
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <pre className="overflow-auto rounded-md bg-slate-900 p-4 text-sm text-slate-100">
      <code className={className} {...props}>
        {children}
      </code>
    </pre>
  );
}

function createPreviewMarkdownComponents(images: SelectedImage[]): Components {
  const imageLookup = new Map(
    images.map((img) => [img.name, img.origin === "existing" ? img.url ?? img.preview : img.preview] as const),
  );
  const sizeLookup = new Map(images.map((img) => [img.name, img.size] as const));

  function resolveImageSource(src?: string): string | undefined {
    if (!src) return undefined;
    if (/^https?:\/\//i.test(src)) return src;
    const trimmed = src.startsWith("/") ? src.slice(1) : src;
    const key = trimmed.split("/").pop() ?? trimmed;
    return imageLookup.get(key) ?? src;
  }

  function resolveSizeClass(name?: string): string {
    if (!name) return "w-full";
    const size = sizeLookup.get(name);
    switch (size) {
      case "small":
        return "mx-auto w-full max-w-sm";
      case "medium":
        return "mx-auto w-full max-w-xl";
      case "large":
        return "mx-auto w-full max-w-4xl";
      case "full":
      default:
        return "w-full";
    }
  }

  return {
    h1: (props: ComponentPropsWithoutRef<"h1">) => (
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100" {...props} />
    ),
    h2: (props: ComponentPropsWithoutRef<"h2">) => (
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100" {...props} />
    ),
    h3: (props: ComponentPropsWithoutRef<"h3">) => (
      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100" {...props} />
    ),
    a: (props: ComponentPropsWithoutRef<"a">) => (
      <a className="text-blue-600 underline hover:text-blue-700" {...props} />
    ),
    ul: (props: ComponentPropsWithoutRef<"ul">) => (
      <ul className="list-disc space-y-2 pl-6" {...props} />
    ),
    ol: (props: ComponentPropsWithoutRef<"ol">) => (
      <ol className="list-decimal space-y-2 pl-6" {...props} />
    ),
    blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
      <blockquote
        className="border-l-4 border-blue-600/40 pl-4 text-slate-600 italic dark:border-blue-500/40 dark:text-slate-300"
        {...props}
      />
    ),
    code: ({ inline, className, children, ...props }: ComponentPropsWithoutRef<"code"> & { inline?: boolean }) =>
      resolveInlineCode(inline, className, children, props),
    p: (props: ComponentPropsWithoutRef<"p">) => <p className="leading-relaxed" {...props} />,
    img: ({ src, alt, ...props }: ComponentPropsWithoutRef<"img">) => {
      const resolved = resolveImageSource(typeof src === "string" ? src : undefined);
      if (!resolved) return null;
      const trimmed = typeof src === "string" ? (src.startsWith("/") ? src.slice(1) : src) : undefined;
      const key = trimmed?.split("/").pop();
      const sizeClass = resolveSizeClass(key);
      return <img src={resolved} alt={alt ?? ""} className={`my-4 rounded-lg ${sizeClass}`} {...props} />;
    },
  };
}

export function NewsManager({ posts: incomingPosts, currentLocale = "bg", onLocaleChange }: Props) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [date, setDate] = useState(() => getTodayInputValue());
  const [locale, setLocale] = useState(currentLocale);
  const [published, setPublished] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [posts, setPosts] = useState<PostItem[]>(incomingPosts ?? []);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "title">("recent");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<SelectedImage[]>([]);

  type Draft = {
    title: string;
    slug: string;
    slugTouched: boolean;
    excerpt: string;
    markdown: string;
    date: string;
    published: boolean;
    images: SelectedImage[];
    featuredImage: string | null;
  };
  const [draftByLocale, setDraftByLocale] = useState<Record<string, Draft>>({
    [currentLocale]: {
      title: "",
      slug: "",
      slugTouched: false,
      excerpt: "",
      markdown: "",
      date: getTodayInputValue(),
      published: false,
      images: [],
      featuredImage: null,
    },
  });

  function cacheCurrentDraft(loc: string) {
    setDraftByLocale((prev) => ({
      ...prev,
      [loc]: {
        title,
        slug,
        slugTouched,
        excerpt,
        markdown,
        date,
        published,
        images,
        featuredImage,
      },
    }));
  }

  function loadDraft(loc: string) {
    const draft = draftByLocale[loc];
    if (!draft) return false;
    setTitle(draft.title);
    setSlug(draft.slug);
    setSlugTouched(draft.slugTouched);
    setExcerpt(draft.excerpt);
    setMarkdown(draft.markdown);
    setDate(draft.date);
    setPublished(draft.published);
    setImages(draft.images);
    setFeaturedImage(draft.featuredImage);
    return true;
  }

  const isSubmitDisabled = useMemo(
    () => title.trim().length === 0 || slug.trim().length === 0 || markdown.trim().length === 0,
    [title, slug, markdown],
  );

  const isEditing = editingId !== null;
  const submitDisabled = isSubmitDisabled || status.type === "loading" || isPrefilling;
  const primaryActionLabel =
    status.type === "loading"
      ? "Saving…"
      : isPrefilling
      ? "Loading…"
      : isEditing
      ? "Save changes"
      : "Save post";
  const previewComponents = useMemo(() => createPreviewMarkdownComponents(images), [images]);
  const previewTitle = title.trim() || (isEditing ? "Editing title" : "Untitled draft");
  const previewDateLabel = formatDateLabel(date);
  const previewExcerpt = excerpt.trim();
  const hasMarkdown = markdown.trim().length > 0;
  const wordCount = useMemo(() => countWords(markdown), [markdown]);
  const readingMinutes = useMemo(() => estimateReadingMinutes(wordCount), [wordCount]);
  const filteredPosts = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const byQuery = posts.filter((post) => {
      if (!q) return true;
      const titleText = (post.title || "").toLowerCase();
      const slugText = (post.id || "").toLowerCase();
      return titleText.includes(q) || slugText.includes(q);
    });
    const byStatus = byQuery.filter((post) => {
      if (filterStatus === "all") return true;
      const isDraft = post.published === false;
      return filterStatus === "draft" ? isDraft : !isDraft;
    });
    const sorted = [...byStatus].sort((a, b) => {
      if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
      const aDate = a.date ? new Date(a.date).getTime() : 0;
      const bDate = b.date ? new Date(b.date).getTime() : 0;
      return sortBy === "recent" ? bDate - aDate : aDate - bDate;
    });
    return sorted;
  }, [posts, filterQuery, filterStatus, sortBy]);
  const featuredPreview = images.find((img) => img.name === featuredImage);
  const featuredPreviewSrc = featuredPreview
    ? featuredPreview.origin === "new"
      ? featuredPreview.preview
      : featuredPreview.url ?? featuredPreview.preview
    : null;

  function handleTitleChange(next: string) {
    setTitle(next);
    if (!slugTouched) {
      setSlug(slugify(next));
    }
    cacheCurrentDraft(locale);
  }

  function handleSlugChange(next: string) {
    setSlug(slugify(next));
    setSlugTouched(true);
    cacheCurrentDraft(locale);
  }

  function generateImageName(original: string, used: Set<string>) {
    const { base, ext } = splitName(original);
    const sanitizedBase = slugify(base);
    const cleanBase = sanitizedBase || "image";
    let candidate = `${cleanBase}${ext}`;
    let counter = 1;
    while (used.has(candidate)) {
      candidate = `${cleanBase}-${counter}${ext}`;
      counter += 1;
    }
    used.add(candidate);
    return candidate;
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setImages((prev) => {
      const used = new Set(prev.map((img) => img.name));
      const next = [...prev];
      files.forEach((file) => {
        const preview = URL.createObjectURL(file);
        const name = generateImageName(file.name, used);
        next.push({ file, preview, name, size: "full", origin: "new" });
      });
      // update cache with next images
      setDraftByLocale((p) => ({
        ...p,
        [locale]: {
          ...(p[locale] ?? {
            title: "",
            slug: "",
            slugTouched: false,
            excerpt: "",
            markdown: "",
            date: getTodayInputValue(),
            published: false,
            images: [],
            featuredImage: null,
          }),
          images: next,
        },
      }));
      return next;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function cleanupNewPreviews(list: SelectedImage[]) {
    list.forEach((img) => {
      if (img.origin === "new") URL.revokeObjectURL(img.preview);
    });
  }

  function resetForm() {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setExcerpt("");
    setMarkdown("");
    setDate(getTodayInputValue());
    setPublished(false);
    setImages([]);
    setEditingId(null);
    setFeaturedImage(null);
    setDraftByLocale((prev) => ({
      ...prev,
      [locale]: {
        title: "",
        slug: "",
        slugTouched: false,
        excerpt: "",
        markdown: "",
        date: getTodayInputValue(),
        published: false,
        images: [],
        featuredImage: null,
      },
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleEditPost(id: string) {
    setIsPrefilling(true);
    setStatus({ type: "idle" });

    try {
      const response = await fetch(`/api/admin/news/${id}?locale=${encodeURIComponent(locale)}`);
      const payload = (await response.json().catch(() => null)) as { post?: PostItem; markdown?: string; published?: boolean; error?: string } | null;

      if (!response.ok || !payload?.post) {
        setStatus({ type: "error", message: payload?.error ?? "Failed to load the post" });
        return;
      }

      cleanupNewPreviews(imagesRef.current);
      const post = payload.post;
      setEditingId(post.id ?? id);
      setTitle(post.title ?? "");
      setSlug(post.id ?? id);
      setSlugTouched(true);
      setExcerpt(post.excerpt ?? "");
      setMarkdown(payload.markdown ?? "");
      setDate(post.date ? post.date.slice(0, 10) : getTodayInputValue());
      setPublished(payload.published !== false);
      const nextImages = (post.images ?? []).map<SelectedImage>((img) => ({
        file: null,
        preview: img.url,
        name: img.name,
        size: img.size ?? "full",
        origin: "existing",
        url: img.url,
      }));
      setImages(nextImages);
      const featuredByUrl = post.image ? (nextImages.find((img) => img.url === post.image) ?? null) : null;
      const nextFeatured = featuredByUrl?.name ?? nextImages[0]?.name ?? null;
      setFeaturedImage(nextFeatured);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("News edit preload error", error);
      setStatus({ type: "error", message: "An error occurred while loading" });
    } finally {
      setIsPrefilling(false);
    }
  }

  function handleCancelEdit() {
    cleanupNewPreviews(imagesRef.current);
    resetForm();
    setStatus({ type: "idle" });
  }

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    if (images.length === 0) {
      if (featuredImage !== null) {
        setFeaturedImage(null);
      }
      return;
    }

    if (!featuredImage || !images.some((img) => img.name === featuredImage)) {
      const fallback = images[0]?.name ?? null;
      if (fallback !== featuredImage) {
        setFeaturedImage(fallback);
      }
    }
  }, [images, featuredImage]);

  function handleImageSizeChange(name: string, size: ImageSize) {
    setImages((prev) => prev.map((img) => (img.name === name ? { ...img, size } : img)));
    cacheCurrentDraft(locale);
  }

  useEffect(() => {
    return () => {
      cleanupNewPreviews(imagesRef.current);
    };
  }, []);

  // Keep list in sync with outer shell
  useEffect(() => {
    setPosts(incomingPosts ?? []);
  }, [incomingPosts]);

  // When outer locale changes, update form locale and, if editing, load the same slug in the new locale
  useEffect(() => {
    if (!currentLocale || currentLocale === locale) return;
    // cache current locale draft when switching
    cacheCurrentDraft(locale);
    setLocale(currentLocale);
    if (editingId) {
      // Refill fields with the other locale's content of the same slug
      (async () => {
        setIsPrefilling(true);
        try {
          const response = await fetch(`/api/admin/news/${editingId}?locale=${encodeURIComponent(currentLocale)}`);
          const payload = (await response.json().catch(() => null)) as { post?: PostItem; markdown?: string; published?: boolean; error?: string } | null;
          if (response.ok && payload?.post) {
            const post = payload.post;
            setTitle(post.title ?? "");
            setSlug(post.id ?? editingId);
            setSlugTouched(true);
            setExcerpt(post.excerpt ?? "");
            setMarkdown(payload.markdown ?? "");
            setDate(post.date ? post.date.slice(0, 10) : getTodayInputValue());
            setPublished(payload.published !== false);
            const nextImages = (post.images ?? []).map<SelectedImage>((img) => ({
              file: null,
              preview: img.url,
              name: img.name,
              size: img.size ?? "full",
              origin: "existing",
              url: img.url,
            }));
            setImages(nextImages);
            const featuredByUrl = post.image ? (nextImages.find((img) => img.url === post.image) ?? null) : null;
            const nextFeatured = featuredByUrl?.name ?? nextImages[0]?.name ?? null;
            setFeaturedImage(nextFeatured);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        } finally {
          setIsPrefilling(false);
        }
      })();
    } else {
      // New post: load cached draft for the new locale or clear
      const loaded = loadDraft(currentLocale);
      if (!loaded) {
        setTitle("");
        setSlug("");
        setSlugTouched(false);
        setExcerpt("");
        setMarkdown("");
        setDate(getTodayInputValue());
        setPublished(false);
        setImages([]);
        setFeaturedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  }, [currentLocale]);

  function handleRemoveImage(name: string) {
    const removingFeatured = featuredImage === name;
    setImages((prev) => {
      const next: SelectedImage[] = [];
      prev.forEach((img) => {
        if (img.name === name) {
          if (img.origin === "new") URL.revokeObjectURL(img.preview);
        } else {
          next.push(img);
        }
      });
      return next;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (removingFeatured) {
      setFeaturedImage(null);
    }
    cacheCurrentDraft(locale);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitDisabled) return;

    setStatus({ type: "loading" });

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("slug", slug);
      formData.append("excerpt", excerpt);
      formData.append("markdown", markdown);
      formData.append("date", date);
      formData.append("locale", locale);
      formData.append("published", String(published));
      const imageMeta = images.map((img) => ({
        name: img.name,
        size: img.size,
        origin: img.origin,
        url: img.origin === "existing" ? img.url : undefined,
      }));
      formData.append("imageMeta", JSON.stringify(imageMeta));
      formData.append("featuredImage", featuredImage ?? "");
      images.forEach((img) => {
        if (img.origin === "new" && img.file) {
          formData.append("images", img.file, img.name);
        }
      });

      const endpoint = isEditing && editingId ? `/api/admin/news/${editingId}` : "/api/admin/news";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; post?: PostItem } | null;

      if (!response.ok || !payload?.post) {
        setStatus({
          type: "error",
          message: payload?.error ?? (isEditing ? "Update failed" : "Creation failed"),
        });
        return;
      }

      const updatedPost = payload.post as PostItem;
      const originalEditingId = editingId;

      if (isEditing && originalEditingId) {
        setPosts((prev) => {
          const filtered = prev.filter((post) => post.id !== originalEditingId && post.id !== updatedPost.id);
          return [updatedPost, ...filtered];
        });
      } else {
        setPosts((prev) => {
          const filtered = prev.filter((post) => post.id !== updatedPost.id);
          return [updatedPost, ...filtered];
        });
      }

      cleanupNewPreviews(imagesRef.current);
      resetForm();
      // clear draft cache for current locale after successful save
      setDraftByLocale((prev) => ({
        ...prev,
        [locale]: {
          title: "",
          slug: "",
          slugTouched: false,
          excerpt: "",
          markdown: "",
          date: getTodayInputValue(),
          published: false,
          images: [],
          featuredImage: null,
        },
      }));
      setStatus({ type: "success", message: isEditing ? "Post updated successfully" : "Post created successfully" });
    } catch (error) {
      console.error("News create client error", error);
      setStatus({ type: "error", message: isEditing ? "Error during update" : "An error occurred during submission" });
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <header className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{isEditing ? "Edit post" : "New post"}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isEditing
              ? "Update content, images and metadata. Saving will replace the published post."
              : "Fill in the form and save to add a new post. Use image filenames in Markdown to embed them."}
          </p>
        </header> 

        {isEditing && (
          <div className="flex flex-col gap-3 rounded border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">Editing: /novini/{editingId}</p>
              <p className="text-xs text-blue-700/80 dark:text-blue-100/80">Changes to Markdown and images will replace the current data.</p>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center justify-center rounded border border-blue-600 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-300 dark:text-blue-100 dark:hover:bg-blue-500/30"
            >
              Cancel editing
            </button>
          </div>
        )}

        {isPrefilling && (
          <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">Loading content…</p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
            <select
              value={published ? "published" : "draft"}
              onChange={(e) => setPublished(e.target.value === "published")}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">New posts start as drafts by default.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Slug *</label>
            <input
              type="text"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              onBlur={() => setSlugTouched(true)}
              required
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
              placeholder="primerna-novina"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">URL: /novini/{slug || "..."}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Images (optional, multiple)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Files are uploaded to Vercel Blob. Use Markdown <code>![alt](/file-name)</code> or <code>![alt](file-name)</code>; filenames are normalized automatically.
              After adding, choose the preferred display size and mark the featured image.
            </p>
            {images.length > 0 && (
              <div className="mt-3 space-y-3">
                {images.map((img) => (
                  <div key={img.name} className="flex items-start gap-3 rounded border border-slate-200 p-2 dark:border-slate-700">
                    <img src={img.preview} alt={img.name} className="h-16 w-16 rounded object-cover" />
                    <div className="flex-1 text-xs text-slate-600 dark:text-slate-400">
                      <p className="font-medium text-slate-700 dark:text-slate-200">{img.name}</p>
                      <p>Reference with <code>![alt]({img.name})</code> in Markdown.</p>
                      <span className="mt-2 inline-flex items-center gap-1 rounded bg-slate-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {img.origin === "existing" ? "Existing image" : "New upload"}
                      </span>
                      <label className="mt-2 block text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Display size</label>
                      <select
                        value={img.size}
                        onChange={(event) => handleImageSizeChange(img.name, event.target.value as ImageSize)}
                        className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                      >
                        {imageSizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {imageSizeLabels[size]}
                          </option>
                        ))}
                      </select>
                      <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <input
                          type="radio"
                          name="featured-image"
                          checked={featuredImage === img.name}
                          onChange={() => setFeaturedImage(img.name)}
                          className="h-3 w-3 border border-slate-400 text-blue-600 focus:ring-blue-500"
                        />
                        Featured image (card)
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.name)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Date</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={3}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
              placeholder="Enter a short summary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Content (Markdown) *</label>
            <textarea
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              rows={6}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
              placeholder="Enter content in Markdown"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Supports standard Markdown (headings, lists, links).</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitDisabled}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {primaryActionLabel}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              disabled={published || status.type === "loading" || isPrefilling}
              onClick={async () => {
                if (published) return; // safety guard
                const target = locale === "bg" ? "en" : "bg";
                setStatus({ type: "loading" });
                try {
                  const res = await fetch("/api/admin/news/translate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sourceLocale: locale,
                      targetLocale: target,
                      title,
                      excerpt,
                      markdown,
                    }),
                  });
                  const payload = (await res.json().catch(() => null)) as { title?: string; excerpt?: string; markdown?: string; error?: string } | null;
                  if (!res.ok || !payload) {
                    setStatus({ type: "error", message: payload?.error ?? "Translate failed" });
                    return;
                  }
                  const nextTitle = payload.title ?? title;
                  const nextExcerpt = payload.excerpt !== undefined ? payload.excerpt : excerpt;
                  const nextMarkdown = payload.markdown ?? markdown;
                  // Prepare target-locale draft with translated fields
                  setDraftByLocale((prev) => ({
                    ...prev,
                    [target]: {
                      title: nextTitle,
                      slug, // keep same slug as base; can be edited after
                      slugTouched,
                      excerpt: nextExcerpt,
                      markdown: nextMarkdown,
                      date,
                      published: false,
                      images,
                      featuredImage,
                    },
                  }));
                  // Exit editing if translating an existing post; this starts a new draft in target locale
                  if (editingId) setEditingId(null);
                  // Trigger global locale switch so list and toolbar update; form will load cached translated draft
                  if (onLocaleChange) onLocaleChange(target);
                  setStatus({ type: "success", message: `Translated to ${target.toUpperCase()} (set as draft)` });
                } catch (e) {
                  setStatus({ type: "error", message: "Translate error" });
                }
              }}
              title={published ? "Switch status to Draft to enable auto-translate" : undefined}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Auto-translate to {locale === "bg" ? "EN" : "BG"}
            </button>
            {status.type === "error" && <span className="text-sm text-red-600">{status.message}</span>}
            {status.type === "success" && <span className="text-sm text-green-600">{status.message}</span>}
          </div>
        </form>
        <div className="border-t border-dashed border-slate-200 pt-5 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preview</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Auto-updates</span>
          </div>
          <article className="markdown-content mt-4 space-y-4 rounded border border-slate-200 bg-slate-50 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
            <header className="space-y-1">
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{previewTitle}</h4>
              {previewDateLabel && <p className="text-xs text-slate-500 dark:text-slate-400">Scheduled for {previewDateLabel}</p>}
              {previewExcerpt && <p className="pt-1 text-sm text-slate-600 dark:text-slate-300">{previewExcerpt}</p>}
            </header>
            {featuredPreviewSrc && (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60">
                <img src={featuredPreviewSrc} alt={previewTitle || "Featured image"} className="h-auto w-full object-cover" />
              </div>
            )}
            {hasMarkdown ? (
              <ReactMarkdown components={previewComponents}>{markdown}</ReactMarkdown>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Add Markdown content to see the preview here.</p>
            )}
          </article>
        </div>
      </section>
      <section className="space-y-4 rounded border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <header>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">News list</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Most recent first.</p>
        </header>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => {
              const isActive = editingId === post.id;
              return (
                <li
                  key={post.id}
                  className={`rounded p-3 ${
                    isActive
                      ? "border border-blue-500/80 bg-blue-50 dark:border-blue-400/70 dark:bg-blue-500/15"
                      : "border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-slate-900 dark:text-slate-100">{post.title}</strong>
                        {post.published === false && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            Draft
                          </span>
                        )}
                      </div>
                      {post.date && <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateLabel(post.date)}</span>}
                    </div>
                    {Array.isArray(post.images) && post.images.length > 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {post.images.length === 1 ? "1 image" : `${post.images.length} images`}
                      </span>
                    )}
                    {post.excerpt && <p className="text-xs text-slate-600 dark:text-slate-400">{post.excerpt}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/${locale}/novini/${post.id}`} className="text-xs font-medium text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        View on site
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleEditPost(post.id)}
                        disabled={isPrefilling || status.type === "loading"}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Edit
                      </button>
                      {isActive && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editingId) return;
                            if (!confirm("Delete this post? This cannot be undone.")) return;
                            setStatus({ type: "loading" });
                            try {
                              const res = await fetch(`/api/admin/news/${editingId}?locale=${locale}`, { method: "DELETE" });
                              if (!res.ok) {
                                const p = await res.json().catch(() => null);
                                setStatus({ type: "error", message: p?.error ?? "Delete failed" });
                              } else {
                                setPosts((prev) => prev.filter((p) => p.id !== editingId));
                                resetForm();
                                setStatus({ type: "success", message: "Post deleted" });
                              }
                            } catch (e) {
                              setStatus({ type: "error", message: "Error during delete" });
                            }
                          }}
                          className="rounded border border-red-500 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      )}
                      {isActive && <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Editing</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
