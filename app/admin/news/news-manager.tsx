"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import type { PostItem } from "@/lib/types";
import {
  NewsBuilderProvider,
  useNewsBuilder,
  NewsBuilderToolbar,
  RichTextEditor,
  useNewsBuilderShortcuts,
  type SelectedImage,
  type ImageSize,
} from "./components";
import {
  NewsBlockPalette,
  NewsBlockCanvas,
  NewsBlockPropertyPanel,
  blocksToMarkdown,
  blocksToJson,
  markdownToBlocks,
} from "./components/blocks";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const imageSizeLabels: Record<ImageSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  full: "Full",
};

const imageSizeOptions: ImageSize[] = ["small", "medium", "large", "full"];

interface Props {
  posts: PostItem[];
  currentLocale: string;
  onLocaleChange?: (locale: string) => void;
  isLocaleLoading?: boolean;
}

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .trim()
    .toLowerCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]+/g, "-")
    .replace(/[\u0000-\u001F\u007F]+/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u0400-\u04FF-]+/g, "")
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
  // European format: dd/mm/yyyy
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

// Inner component that uses the context
function NewsManagerInner({
  posts: incomingPosts,
  currentLocale = "bg",
  onLocaleChange,
  isLocaleLoading: externalLocaleLoading,
}: Props) {
  const {
    state,
    setField,
    setForm,
    resetForm,
    setEditingId,
    setPrefilling,
    addImage,
    removeImage,
    updateImageSize,
    setFeaturedImage,
    setImages,
    isEditing,
    addBlock,
    toggleBlockMode,
  } = useNewsBuilder();

  const { form, editingId, isPrefilling, selectedBlockId } = state;
  const {
    title,
    slug,
    slugTouched,
    excerpt,
    markdown,
    date,
    published,
    images,
    featuredImage,
    blocks,
    useBlocks,
  } = form;

  const [locale, setLocale] = useState(currentLocale);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [posts, setPosts] = useState<PostItem[]>(incomingPosts ?? []);
  const [filterQuery, setFilterQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest" | "title">("recent");
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagesRef = useRef<SelectedImage[]>([]);

  // Version history UI state
  type VersionInfo = {
    id?: string;
    version: number;
    title: string;
    createdAt?: string;
    createdBy?: { name?: string | null; email?: string | null } | null;
  };
  const [showVersions, setShowVersions] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [versionsError, setVersionsError] = useState<string | null>(null);

  // Draft caching per locale
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
    blocks: unknown[];
    useBlocks: boolean;
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
      blocks: [],
      useBlocks: false,
    },
  });

  // Keyboard shortcuts
  useNewsBuilderShortcuts({
    onSave: () => {
      if (!isSubmitDisabled && status.type !== "loading") {
        handleSubmit(new Event("submit") as unknown as FormEvent);
      }
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
        blocks,
        useBlocks,
      },
    }));
  }

  function loadDraft(loc: string) {
    const draft = draftByLocale[loc];
    if (!draft) return false;
    setForm({
      title: draft.title,
      slug: draft.slug,
      slugTouched: draft.slugTouched,
      excerpt: draft.excerpt,
      markdown: draft.markdown,
      date: draft.date,
      published: draft.published,
      images: draft.images,
      featuredImage: draft.featuredImage,
      blocks: (draft.blocks || []) as any,
      useBlocks: draft.useBlocks || false,
    });
    return true;
  }

  const isSubmitDisabled = useMemo(
    () =>
      title.trim().length === 0 ||
      slug.trim().length === 0 ||
      (useBlocks ? blocks.length === 0 : markdown.trim().length === 0),
    [title, slug, markdown, useBlocks, blocks]
  );

  const submitDisabled = isSubmitDisabled || status.type === "loading" || isPrefilling;

  const contentForWordCount = useMemo(() => {
    if (useBlocks) {
      return blocksToMarkdown(blocks);
    }
    return markdown;
  }, [useBlocks, blocks, markdown]);

  const wordCount = useMemo(() => countWords(contentForWordCount), [contentForWordCount]);
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
    setField("title", next);
    if (!slugTouched) {
      setField("slug", slugify(next));
    }
    cacheCurrentDraft(locale);
  }

  function handleSlugChange(next: string) {
    setField("slug", slugify(next));
    setField("slugTouched", true);
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

    const used = new Set(images.map((img) => img.name));
    files.forEach((file) => {
      const preview = URL.createObjectURL(file);
      const name = generateImageName(file.name, used);
      addImage({ file, preview, name, size: "full", origin: "new" });
    });

    cacheCurrentDraft(locale);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function cleanupNewPreviews(list: SelectedImage[]) {
    list.forEach((img) => {
      if (img.origin === "new") URL.revokeObjectURL(img.preview);
    });
  }

  function handleResetForm() {
    cleanupNewPreviews(imagesRef.current);
    resetForm();
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
        blocks: [],
        useBlocks: false,
      },
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setStatus({ type: "idle" });
  }

  async function handleEditPost(id: string) {
    setPrefilling(true);
    setStatus({ type: "idle" });

    try {
      const response = await fetch(
        `/api/admin/news/${id}?locale=${encodeURIComponent(locale)}`
      );
      const payload = (await response.json().catch(() => null)) as {
        post?: PostItem;
        markdown?: string;
        blocks?: unknown[] | null;
        useBlocks?: boolean;
        published?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !payload?.post) {
        setStatus({ type: "error", message: payload?.error ?? "Failed to load the post" });
        setPrefilling(false);
        return;
      }

      cleanupNewPreviews(imagesRef.current);
      const post = payload.post;
      setEditingId(post.id ?? id);

      const nextImages = (post.images ?? []).map<SelectedImage>((img) => ({
        file: null,
        preview: img.url,
        name: img.name,
        size: (img.size ?? "full") as ImageSize,
        origin: "existing",
        url: img.url,
      }));

      const featuredByUrl = post.image
        ? nextImages.find((img) => img.url === post.image) ?? null
        : null;
      const nextFeatured = featuredByUrl?.name ?? nextImages[0]?.name ?? null;

      // Parse blocks from payload
      const loadedBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];

      setForm({
        title: post.title ?? "",
        slug: post.id ?? id,
        slugTouched: true,
        excerpt: post.excerpt ?? "",
        markdown: payload.markdown ?? "",
        date: post.date ? post.date.slice(0, 10) : getTodayInputValue(),
        published: payload.published !== false,
        images: nextImages,
        featuredImage: nextFeatured,
        blocks: loadedBlocks as any,
        useBlocks: payload.useBlocks ?? false,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("News edit preload error", error);
      setStatus({ type: "error", message: "An error occurred while loading" });
    } finally {
      setPrefilling(false);
    }
  }

  function handleRemoveImage(name: string) {
    const img = images.find((i) => i.name === name);
    if (img?.origin === "new") {
      URL.revokeObjectURL(img.preview);
    }
    removeImage(name);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    cacheCurrentDraft(locale);
  }

  // Keep imagesRef in sync
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Auto-set featured image
  useEffect(() => {
    if (images.length === 0 && featuredImage !== null) {
      setFeaturedImage(null);
      return;
    }
    if (images.length > 0 && (!featuredImage || !images.some((img) => img.name === featuredImage))) {
      setFeaturedImage(images[0]?.name ?? null);
    }
  }, [images, featuredImage, setFeaturedImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupNewPreviews(imagesRef.current);
    };
  }, []);

  // Keep list in sync
  useEffect(() => {
    setPosts(incomingPosts ?? []);
  }, [incomingPosts]);

  // Locale switching
  useEffect(() => {
    if (!currentLocale || currentLocale === locale) return;
    cacheCurrentDraft(locale);
    setLocale(currentLocale);

    if (editingId) {
      (async () => {
        setPrefilling(true);
        try {
          const response = await fetch(
            `/api/admin/news/${editingId}?locale=${encodeURIComponent(currentLocale)}`
          );
          const payload = (await response.json().catch(() => null)) as {
            post?: PostItem;
            markdown?: string;
            blocks?: unknown[] | null;
            useBlocks?: boolean;
            published?: boolean;
            error?: string;
          } | null;
          if (response.ok && payload?.post) {
            const post = payload.post;
            const nextImages = (post.images ?? []).map<SelectedImage>((img) => ({
              file: null,
              preview: img.url,
              name: img.name,
              size: (img.size ?? "full") as ImageSize,
              origin: "existing",
              url: img.url,
            }));
            const featuredByUrl = post.image
              ? nextImages.find((img) => img.url === post.image) ?? null
              : null;
            const nextFeatured = featuredByUrl?.name ?? nextImages[0]?.name ?? null;
            const loadedBlocks = Array.isArray(payload.blocks) ? payload.blocks : [];
            setForm({
              title: post.title ?? "",
              slug: post.id ?? editingId,
              slugTouched: true,
              excerpt: post.excerpt ?? "",
              markdown: payload.markdown ?? "",
              date: post.date ? post.date.slice(0, 10) : getTodayInputValue(),
              published: payload.published !== false,
              images: nextImages,
              featuredImage: nextFeatured,
              blocks: loadedBlocks as any,
              useBlocks: payload.useBlocks ?? false,
            });
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        } finally {
          setPrefilling(false);
        }
      })();
    } else {
      const loaded = loadDraft(currentLocale);
      if (!loaded) {
        resetForm();
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  }, [currentLocale]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitDisabled) return;

    setStatus({ type: "loading" });

    try {
      // Convert blocks to markdown if in block mode
      const contentMarkdown = useBlocks ? blocksToMarkdown(blocks) : markdown;
      const blocksJson = useBlocks ? blocksToJson(blocks) : "";

      const formData = new FormData();
      formData.append("title", title);
      formData.append("slug", slug);
      formData.append("excerpt", excerpt);
      formData.append("markdown", contentMarkdown);
      formData.append("blocksJson", blocksJson);
      formData.append("useBlocks", String(useBlocks));
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

      const endpoint =
        isEditing && editingId ? `/api/admin/news/${editingId}` : "/api/admin/news";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        post?: PostItem;
      } | null;

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
          const filtered = prev.filter(
            (post) => post.id !== originalEditingId && post.id !== updatedPost.id
          );
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
          blocks: [],
          useBlocks: false,
        },
      }));
      setStatus({
        type: "success",
        message: isEditing ? "Post updated successfully" : "Post created successfully",
      });
    } catch (error) {
      console.error("News create client error", error);
      setStatus({
        type: "error",
        message: isEditing ? "Error during update" : "An error occurred during submission",
      });
    }
  }

  const previewTitle = title.trim() || (isEditing ? "Editing title" : "Untitled draft");
  const previewDateLabel = formatDateLabel(date);
  const previewExcerpt = excerpt.trim();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
      {/* Toolbar */}
      <NewsBuilderToolbar
        onSave={() => handleSubmit(new Event("submit") as unknown as FormEvent)}
        isSaving={status.type === "loading"}
        showPreviewPanel={showPreviewPanel}
        setShowPreviewPanel={setShowPreviewPanel}
        onCancelEdit={handleResetForm}
        locale={locale}
        onLocaleChange={onLocaleChange}
        isLocaleLoading={isPrefilling || externalLocaleLoading}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Block Palette (when in block mode) */}
        {useBlocks && (
          <div className="w-72 flex-shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
            <NewsBlockPalette onAddBlock={(blockType) => addBlock(blockType)} />
          </div>
        )}

        {/* Form Panel / Block Canvas */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-200 dark:border-slate-700">
          {useBlocks ? (
            <div className="flex-1 overflow-y-auto">
              {/* Metadata form at the top */}
              <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <form className="mx-auto max-w-3xl space-y-4" onSubmit={handleSubmit}>
                  {/* Edit Mode Banner */}
                  {isEditing && (
                    <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50/80 px-4 py-3 text-sm text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-100 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">Editing: /novini/{editingId}</p>
                        <p className="text-xs text-brand-700/80 dark:text-brand-100/80">
                          Changes will replace the current data.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      placeholder="Enter post title"
                    />
                  </div>

                  {/* Status, Slug & Date Row */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Status
                      </label>
                      <select
                        value={published ? "published" : "draft"}
                        onChange={(e) => setField("published", e.target.value === "published")}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Slug <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        onBlur={() => setField("slugTouched", true)}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        placeholder="example-post-slug"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Date
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setField("date", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Excerpt
                    </label>
                    <textarea
                      value={excerpt}
                      onChange={(e) => setField("excerpt", e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      placeholder="Enter a short summary"
                    />
                  </div>

                  {/* Featured Image (Block Mode) */}
                  {images.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Featured Image (Title Card)
                      </label>
                      {featuredPreviewSrc && (
                        <div className="relative inline-block">
                          <img
                            src={featuredPreviewSrc}
                            alt="Featured"
                            className="h-24 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                          />
                          <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                            {featuredImage}
                          </div>
                        </div>
                      )}
                      <select
                        value={featuredImage ?? ""}
                        onChange={(e) => setFeaturedImage(e.target.value || null)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      >
                        {images.map((img) => (
                          <option key={img.name} value={img.name}>
                            {img.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Cover image for the news card.
                      </p>
                    </div>
                  )}

                  {/* Images (Block Mode Upload/Manage) */}
                  <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Images
                      </label>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {images.length} image{images.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 dark:text-slate-300"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Use blocks or Markdown to embed images. Featured selector chooses the title card image.
                    </p>

                    {images.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {images.map((img) => (
                          <div
                            key={img.name}
                            className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <img
                              src={img.preview}
                              alt={img.name}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                            <div className="flex-1 text-xs text-slate-600 dark:text-slate-400">
                              <p className="font-medium text-slate-700 dark:text-slate-200">
                                {img.name}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <select
                                  value={img.size}
                                  onChange={(e) =>
                                    updateImageSize(img.name, e.target.value as ImageSize)
                                  }
                                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700"
                                >
                                  {imageSizeOptions.map((size) => (
                                    <option key={size} value={size}>
                                      {imageSizeLabels[size]}
                                    </option>
                                  ))}
                                </select>
                                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                                  <input
                                    type="radio"
                                    name="featured-image"
                                    checked={featuredImage === img.name}
                                    onChange={() => setFeaturedImage(img.name)}
                                    className="h-3 w-3"
                                  />
                                  Featured
                                </label>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.name)}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Editor Mode:
                      </span>
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                        Block Editor
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleBlockMode}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Switch to Markdown
                    </button>
                  </div>

                  {/* Block Mode Actions: Version History & Auto-Translate */}
                  {isEditing && (
                    <div className="flex items-center gap-2 pt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!editingId) return;
                          setShowVersions(true);
                          setVersionsLoading(true);
                          setVersionsError(null);
                          try {
                            const res = await fetch(`/api/admin/news/${encodeURIComponent(editingId)}?action=versions&locale=${encodeURIComponent(locale)}`, { method: "GET" });
                            const payload = (await res.json().catch(() => null)) as { versions?: VersionInfo[]; error?: string } | null;
                            if (!res.ok || !payload?.versions) {
                              setVersionsError(payload?.error ?? "Failed to load versions");
                            } else {
                              setVersions(payload.versions);
                            }
                          } catch {
                            setVersionsError("Failed to load versions");
                          } finally {
                            setVersionsLoading(false);
                          }
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Version history
                      </button>

                      <button
                        type="button"
                        disabled={published || status.type === "loading" || isPrefilling}
                        onClick={async () => {
                          if (published) return;
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
                                markdown: blocksToMarkdown(blocks),
                              }),
                            });
                            const payload = (await res.json().catch(() => null)) as {
                              title?: string;
                              excerpt?: string;
                              markdown?: string;
                              error?: string;
                            } | null;
                            if (!res.ok || !payload) {
                              setStatus({
                                type: "error",
                                message: payload?.error ?? "Translate failed",
                              });
                              return;
                            }
                            const nextTitle = payload.title ?? title;
                            const nextExcerpt = payload.excerpt !== undefined ? payload.excerpt : excerpt;
                            const nextMarkdown = payload.markdown ?? "";
                            const translatedBlocks = nextMarkdown ? markdownToBlocks(nextMarkdown) : blocks;
                            setDraftByLocale((prev) => ({
                              ...prev,
                              [target]: {
                                title: nextTitle,
                                slug,
                                slugTouched,
                                excerpt: nextExcerpt,
                                markdown: "",
                                date,
                                published: false,
                                images,
                                featuredImage,
                                blocks: translatedBlocks,
                                useBlocks: true,
                              },
                            }));
                            if (editingId) setEditingId(null);
                            if (onLocaleChange) onLocaleChange(target);
                            setStatus({
                              type: "success",
                              message: `Translated to ${target.toUpperCase()} (set as draft)`,
                            });
                          } catch {
                            setStatus({ type: "error", message: "Translate error" });
                          }
                        }}
                        title={published ? "Switch to Draft to enable auto-translate" : undefined}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Auto-translate to {locale === "bg" ? "EN" : "BG"}
                      </button>
                    </div>
                  )}

                  {status.type === "error" && (
                    <span className="text-sm text-red-600">{status.message}</span>
                  )}
                  {status.type === "success" && (
                    <span className="text-sm text-green-600">{status.message}</span>
                  )}
                </form>
              </div>

              {/* Block Canvas */}
              <NewsBlockCanvas />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <form className="mx-auto max-w-3xl space-y-6" onSubmit={handleSubmit}>
              {/* Edit Mode Banner */}
              {isEditing && (
                <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50/80 px-4 py-3 text-sm text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-100 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">Editing: /novini/{editingId}</p>
                    <p className="text-xs text-brand-700/80 dark:text-brand-100/80">
                      Changes will replace the current data.
                    </p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isPrefilling && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
                  Loading content...
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Enter post title"
                />
              </div>

              {/* Status & Slug Row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Status
                  </label>
                  <select
                    value={published ? "published" : "draft"}
                    onChange={(e) => setField("published", e.target.value === "published")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    onBlur={() => setField("slugTouched", true)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                    placeholder="example-post-slug"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    URL: /novini/{slug || "..."}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setField("date", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  
                />
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Excerpt
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setField("excerpt", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Enter a short summary"
                />
              </div>

              {/* Featured Image Preview/Selector */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Featured Image (Title Card)
                  </label>
                  {featuredPreviewSrc && (
                    <div className="relative inline-block">
                      <img
                        src={featuredPreviewSrc}
                        alt="Featured"
                        className="h-32 w-full max-w-md rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                      />
                      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                        {featuredImage}
                      </div>
                    </div>
                  )}
                  <select
                    value={featuredImage ?? ""}
                    onChange={(e) => setFeaturedImage(e.target.value || null)}
                    className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    {images.map((img) => (
                      <option key={img.name} value={img.name}>
                        {img.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This image will be displayed as the cover for this news article.
                  </p>
                </div>
              )}

              {/* Images */}
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Images
                  </label>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {images.length} image{images.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 dark:text-slate-300"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use Markdown <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">![alt](filename)</code> to embed images in content.
                </p>

                {images.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {images.map((img) => (
                      <div
                        key={img.name}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <img
                          src={img.preview}
                          alt={img.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 text-xs text-slate-600 dark:text-slate-400">
                          <p className="font-medium text-slate-700 dark:text-slate-200">
                            {img.name}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                              value={img.size}
                              onChange={(e) =>
                                updateImageSize(img.name, e.target.value as ImageSize)
                              }
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700"
                            >
                              {imageSizeOptions.map((size) => (
                                <option key={size} value={size}>
                                  {imageSizeLabels[size]}
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                              <input
                                type="radio"
                                name="featured-image"
                                checked={featuredImage === img.name}
                                onChange={() => setFeaturedImage(img.name)}
                                className="h-3 w-3"
                              />
                              Featured
                            </label>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.name)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Mode Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {useBlocks ? "Block Editor" : "Markdown"}
                    </span>
                    <button
                      type="button"
                      onClick={toggleBlockMode}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                        useBlocks ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                      role="switch"
                      aria-checked={useBlocks}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          useBlocks ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {useBlocks ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use the block palette on the right to add content blocks. Click a block to edit its properties.
                  </p>
                ) : (
                  <RichTextEditor
                    label=""
                    required
                    value={markdown}
                    onChange={(val) => setField("markdown", val)}
                    placeholder="Write your post content here..."
                    images={images.map((img) => ({
                      name: img.name,
                      preview: img.preview,
                      url: img.url,
                      size: img.size,
                    }))}
                  />
                )}
              </div>

              {/* Status Messages & Actions */}
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-500 disabled:opacity-50"
                >
                  {status.type === "loading" ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    "Save changes"
                  ) : (
                    "Save post"
                  )}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                )}

                {/* Version History Button */}
                {isEditing && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editingId) return;
                      setShowVersions(true);
                      setVersionsLoading(true);
                      setVersionsError(null);
                      try {
                        const res = await fetch(`/api/admin/news/${encodeURIComponent(editingId)}?action=versions&locale=${encodeURIComponent(locale)}`, { method: "GET" });
                        const payload = (await res.json().catch(() => null)) as { versions?: VersionInfo[]; error?: string } | null;
                        if (!res.ok || !payload?.versions) {
                          setVersionsError(payload?.error ?? "Failed to load versions");
                        } else {
                          setVersions(payload.versions);
                        }
                      } catch {
                        setVersionsError("Failed to load versions");
                      } finally {
                        setVersionsLoading(false);
                      }
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Version history
                  </button>
                )}

                <button
                  type="button"
                  disabled={published || status.type === "loading" || isPrefilling}
                  onClick={async () => {
                    if (published) return;
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
                      const payload = (await res.json().catch(() => null)) as {
                        title?: string;
                        excerpt?: string;
                        markdown?: string;
                        error?: string;
                      } | null;
                      if (!res.ok || !payload) {
                        setStatus({
                          type: "error",
                          message: payload?.error ?? "Translate failed",
                        });
                        return;
                      }
                      const nextTitle = payload.title ?? title;
                      const nextExcerpt = payload.excerpt !== undefined ? payload.excerpt : excerpt;
                      const nextMarkdown = payload.markdown ?? markdown;
                      setDraftByLocale((prev) => ({
                        ...prev,
                        [target]: {
                          title: nextTitle,
                          slug,
                          slugTouched,
                          excerpt: nextExcerpt,
                          markdown: nextMarkdown,
                          date,
                          published: false,
                          images,
                          featuredImage,
                          blocks: [],
                          useBlocks: false,
                        },
                      }));
                      if (editingId) setEditingId(null);
                      if (onLocaleChange) onLocaleChange(target);
                      setStatus({
                        type: "success",
                        message: `Translated to ${target.toUpperCase()} (set as draft)`,
                      });
                    } catch {
                      setStatus({ type: "error", message: "Translate error" });
                    }
                  }}
                  title={published ? "Switch to Draft to enable auto-translate" : undefined}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Auto-translate to {locale === "bg" ? "EN" : "BG"}
                </button>

                {status.type === "error" && (
                  <span className="text-sm text-red-600">{status.message}</span>
                )}
                {status.type === "success" && (
                  <span className="text-sm text-green-600">{status.message}</span>
                )}
              </div>
            </form>
          </div>
          )}
        </div>

        {/* Right Panel - Property Editor (block mode) or Preview/List (markdown mode) */}
        {showPreviewPanel && (
          <div className="w-[28rem] flex-shrink-0 overflow-hidden bg-white dark:bg-slate-900">
            {useBlocks && selectedBlockId ? (
              /* Block Property Editor */
              <NewsBlockPropertyPanel />
            ) : (
              <div className="h-full overflow-y-auto">
                {/* Preview Section */}
                <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Preview
                    </h3>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                    {wordCount} words
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                    ~{readingMinutes} min
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 dark:border-slate-700 dark:bg-slate-800">
                    {images.length} img
                  </span>
                </div>
              </div>
              <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <header className="space-y-1">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {previewTitle}
                  </h4>
                  {previewDateLabel && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {previewDateLabel}
                    </p>
                  )}
                  {previewExcerpt && (
                    <p className="pt-1 text-sm text-slate-600 dark:text-slate-300">
                      {previewExcerpt}
                    </p>
                  )}
                </header>
                {featuredPreviewSrc && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <img
                      src={featuredPreviewSrc}
                      alt={previewTitle || "Featured"}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                )}
              </article>
            </div>

            {/* News List Section */}
            <div className="p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  News list
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {filteredPosts.length} shown · {posts.length} total
                </p>
              </div>

              {/* Filters */}
              <div className="mb-4 space-y-2">
                <input
                  type="search"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Search by title or slug..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as typeof filterStatus)
                    }
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="all">All</option>
                    <option value="published">Published</option>
                    <option value="draft">Drafts</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="recent">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="title">A→Z</option>
                  </select>
                </div>
              </div>

              {/* Posts List */}
              {filteredPosts.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  {posts.length === 0 ? "No posts yet." : "No matches."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredPosts.map((post) => {
                    const isActive = editingId === post.id;
                    return (
                      <li
                        key={post.id}
                        className={`rounded-lg p-3 transition-colors ${
                          isActive
                            ? "border-2 border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10"
                            : "border border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <strong className="truncate text-sm text-slate-900 dark:text-slate-100">
                                {post.title}
                              </strong>
                              {post.published === false && (
                                <span className="flex-shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                  Draft
                                </span>
                              )}
                            </div>
                            {post.date && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDateLabel(post.date)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Link
                            href={`/${locale}/novini/${post.id}`}
                            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleEditPost(post.id)}
                            disabled={isPrefilling || status.type === "loading"}
                            className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          {isActive && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!editingId) return;
                                if (!confirm("Delete this post? This cannot be undone."))
                                  return;
                                setStatus({ type: "loading" });
                                try {
                                  const res = await fetch(
                                    `/api/admin/news/${editingId}?locale=${locale}`,
                                    { method: "DELETE" }
                                  );
                                  if (!res.ok) {
                                    const p = await res.json().catch(() => null);
                                    setStatus({
                                      type: "error",
                                      message: p?.error ?? "Delete failed",
                                    });
                                  } else {
                                    setPosts((prev) =>
                                      prev.filter((p) => p.id !== editingId)
                                    );
                                    handleResetForm();
                                    setStatus({ type: "success", message: "Post deleted" });
                                  }
                                } catch {
                                  setStatus({
                                    type: "error",
                                    message: "Error during delete",
                                  });
                                }
                              }}
                              className="rounded border border-red-500 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Versions Modal */}
      <VersionsModal
        open={showVersions}
        onClose={() => setShowVersions(false)}
        loading={versionsLoading}
        error={versionsError}
        versions={versions}
        onRestore={async (version) => {
          if (!editingId) return;
          if (!confirm(`Restore to version ${version}? This will replace current content.`)) return;
          setStatus({ type: "loading" });
          try {
            const res = await fetch(`/api/admin/news/${encodeURIComponent(editingId)}?action=restore&locale=${encodeURIComponent(locale)}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ version }),
            });
            const payload = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
            if (!res.ok || !payload?.success) {
              setStatus({ type: "error", message: payload?.error ?? "Restore failed" });
              return;
            }
            // Reload the post content
            await handleEditPost(editingId);
            setShowVersions(false);
            setStatus({ type: "success", message: `Restored to version ${version}` });
          } catch {
            setStatus({ type: "error", message: "Restore error" });
          }
        }}
      />
    </div>
  );
}

// Wrapper component with provider
export function NewsManager(props: Props) {
  return (
    <NewsBuilderProvider>
      <NewsManagerInner {...props} />
    </NewsBuilderProvider>
  );
}

// Inline modal for Version History
function VersionsModal(props: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  versions: { version: number; title: string; createdAt?: string; createdBy?: { name?: string | null; email?: string | null } | null }[];
  onRestore: (version: number) => Promise<void>;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Version history</h3>
          <button onClick={props.onClose} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">Close</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {props.loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
              Loading versions...
            </div>
          ) : props.error ? (
            <p className="text-sm text-red-600">{props.error}</p>
          ) : props.versions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No versions yet.</p>
          ) : (
            <ul className="space-y-2">
              {props.versions.map((v) => {
                const dateLabel = v.createdAt ? new Date(v.createdAt).toLocaleString() : "";
                const byLabel = v.createdBy?.name || v.createdBy?.email || "";
                return (
                  <li key={`v-${v.version}`} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">{v.version}</span>
                        <strong className="truncate text-slate-900 dark:text-slate-100">{v.title || `(untitled)`}</strong>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{dateLabel}{byLabel ? ` · ${byLabel}` : ""}</p>
                    </div>
                    <button
                      onClick={() => props.onRestore(v.version)}
                      className="rounded border border-brand-500 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-900/20"
                    >
                      Restore
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
