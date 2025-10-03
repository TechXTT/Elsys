import React from 'react';
import { PostItem } from '../lib/types';

export const NewsCard: React.FC<{ post: PostItem }> = ({ post }) => (
  <a href={post.href} className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md transition dark:border-slate-700 dark:bg-slate-800">
    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{post.title}</h3>
    {post.excerpt && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{post.excerpt}</p>}
  </a>
);
