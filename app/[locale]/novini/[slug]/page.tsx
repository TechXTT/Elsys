import React, { type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";
import { getNewsPosts, getNewsPost } from "@/lib/news";
import type { PostItem } from "@/lib/types";

function resolveInlineCode(
  inline: boolean | undefined,
  className: string | undefined,
  children: React.ReactNode,
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

function createMarkdownComponents(images: PostItem["images"] | undefined): Components {
  const imageLookup = new Map(
    (images ?? []).map((img) => [img.name, img.url] as const),
  );
  const sizeLookup = new Map(
    (images ?? []).map((img) => [img.name, img.size ?? "full"] as const),
  );

  function resolveSizeClass(name: string | undefined): string {
    if (!name) return "";
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

  function resolveImageSource(src?: string): string | undefined {
    if (!src) return undefined;
    if (/^https?:\/\//i.test(src)) return src;
    const trimmed = src.startsWith("/") ? src.slice(1) : src;
    const key = trimmed.split("/").pop() ?? trimmed;
    return imageLookup.get(key) ?? src;
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

function resolveDateLocale(locale: Locale) {
  switch (locale) {
    case "bg":
      return "bg-BG";
    case "en":
      return "en-GB";
    default:
      return locale;
  }
}

function formatPublishedDate(locale: Locale, value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(resolveDateLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function NewsDetail({ params }: { params: { locale: Locale; slug: string } }) {
  const locale = params.locale;
  const [tNews, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "News" }),
    getTranslations({ locale, namespace: "Common" }),
  ]);
  const fromDb = await getNewsPost(params.slug, locale);
  if (!fromDb) {
    return <div className="container-page py-20">{tNews("missing")}</div>;
  }
  const { post: item, markdown } = fromDb;
  const displayDate = formatPublishedDate(locale, item.date);
  const markdownComponents = createMarkdownComponents(item.images);
  return (
    <div className="container-page py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{item.title}</h1>
      {displayDate && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tNews("publishedOn", { date: displayDate })}</p>
      )}
      {/* {item.image && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <img src={item.image} alt={item.title} className="h-auto w-full object-cover" />
        </div>
      )}
      {item.excerpt && <p className="mt-4 text-slate-600 dark:text-slate-400">{item.excerpt}</p>} */}
      {markdown ? (
        <ReactMarkdown className="markdown-content mt-6 space-y-4 text-slate-700 dark:text-slate-300" components={markdownComponents}>
          {markdown}
        </ReactMarkdown>
      ) : (
        <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">{tCommon("comingSoon")}</div>
      )}
    </div>
  );
}


