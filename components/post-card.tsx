import React from "react";

import { Link } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";
import { PostItem } from "@/lib/types";

export const PostCard: React.FC<{ post: PostItem; locale?: Locale }> = ({ post, locale }) => (
  <Link
    href={post.href}
    locale={locale}
    className="hover-lift block rounded-lg border border-slate-200 bg-white p-4 transition dark:border-slate-700 dark:bg-slate-800"
  >
    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{post.title}</h3>
    {post.excerpt && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{post.excerpt}</p>}
  </Link>
);
