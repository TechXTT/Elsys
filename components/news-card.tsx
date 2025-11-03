import React from "react";

import { Link } from "@/i18n/routing";
import { defaultLocale, type Locale } from "@/i18n/config";
import { PostItem } from "@/lib/types";

function resolveDateLocale(locale: Locale): string {
  // Restrict to known-good BCP 47 tags and fallback to en-GB
  if (locale === "bg") return "bg-BG";
  if (locale === "en") return "en-GB";
  return "en-GB";
}

function formatDateLabel(value: string | undefined, locale: Locale) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  const primary = resolveDateLocale(locale);
  try {
    return new Intl.DateTimeFormat(primary, options).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat("en-GB", options).format(date);
    } catch {
      return new Intl.DateTimeFormat(undefined, options).format(date);
    }
  }
}

interface NewsCardProps {
  post: PostItem;
  locale?: Locale;
}

export const NewsCard: React.FC<NewsCardProps> = ({ post, locale = defaultLocale }) => {
  const displayDate = formatDateLabel(post.date, locale);
  const coverImage = post.image ?? post.images?.[0]?.url;
  return (
    <Link
      href={post.href}
      locale={locale}
      className="hover-lift block overflow-hidden rounded-lg border border-slate-200 bg-white transition dark:border-slate-700 dark:bg-slate-800"
    >
      {coverImage && (
        <div className="aspect-[4/3] overflow-hidden border-b border-slate-200 dark:border-slate-700">
          <img src={coverImage} alt={post.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-4">
        {displayDate && <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{displayDate}</p>}
        <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{post.title}</h3>
        {post.excerpt && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{post.excerpt}</p>}
      </div>
    </Link>
  );
};
