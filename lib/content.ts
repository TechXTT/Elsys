import fs from 'fs';
import path from 'path';
import { HomeContent, PostItem } from './types';

const contentDir = path.join(process.cwd(), 'content');

export function loadJson<T>(relPath: string): T | null {
  try {
    const full = path.join(contentDir, relPath);
    const raw = fs.readFileSync(full, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadHome(): HomeContent | null {
  return loadJson<HomeContent>('home.json');
}

export function loadNewsJson(): PostItem[] {
  const data = loadJson<PostItem[]>('news/example-post.json');
  if (Array.isArray(data)) return data;
  return [];
}

export function loadBlogJson(): PostItem[] {
  const data = loadJson<PostItem[]>('events/example-event.json');
  if (Array.isArray(data)) return data;
  return [];
}
