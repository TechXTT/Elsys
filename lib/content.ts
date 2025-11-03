import fs from "fs";
import path from "path";

import { defaultLocale, type Locale } from "@/i18n/config";

import { HomeContent, PostItem } from "./types";

const contentDir = path.join(process.cwd(), "content");

const newsIndexRelPath = "news/index.json";
const newsFallbackRelPath = "news/example-post.json";
const newsMarkdownDirRelPath = "news";

function resolveLocaleCandidates(locale: Locale | undefined): Locale[] {
  const candidates: Locale[] = [];
  if (locale && !candidates.includes(locale)) candidates.push(locale);
  if (!candidates.includes(defaultLocale)) candidates.push(defaultLocale);
  return candidates;
}

function loadFile(relPath: string, locale?: Locale): string | null {
  const candidates = resolveLocaleCandidates(locale);
  for (const currentLocale of candidates) {
    const full = path.join(contentDir, currentLocale, relPath);
    try {
      return fs.readFileSync(full, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`Failed to read content file ${full}`, error);
      }
    }
  }
  return null;
}

export function loadJson<T>(relPath: string, locale?: Locale): T | null {
  const raw = loadFile(relPath, locale ?? defaultLocale);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to parse JSON for ${relPath}`, error);
    return null;
  }
}

export function loadHome(locale?: Locale): HomeContent | null {
  return loadJson<HomeContent>("home.json", locale);
}

export function loadNewsJson(locale?: Locale): PostItem[] {
  const primary = loadJson<PostItem[]>(newsIndexRelPath, locale);
  if (Array.isArray(primary)) return primary;
  const fallback = loadJson<PostItem[]>(newsFallbackRelPath, locale);
  if (Array.isArray(fallback)) return fallback;
  return [];
}

export function loadBlogJson(locale?: Locale): PostItem[] {
  const data = loadJson<PostItem[]>("events/example-event.json", locale);
  if (Array.isArray(data)) return data;
  return [];
}

export function loadSectionItems(section: string, locale?: Locale): PostItem[] {
  const data = loadJson<PostItem[]>(`${section}/index.json`, locale);
  if (Array.isArray(data)) return data;
  return [];
}

function getLocalizedPath(relPath: string, locale?: Locale) {
  const candidates = resolveLocaleCandidates(locale);
  return path.join(contentDir, candidates[0], relPath);
}

export function getNewsFilePath(locale?: Locale): string {
  return getLocalizedPath(newsIndexRelPath, locale);
}

export function getNewsMarkdownPath(slug: string, locale?: Locale): string {
  return getLocalizedPath(path.join(newsMarkdownDirRelPath, `${slug}.md`), locale);
}

export function loadNewsMarkdown(slug: string, locale?: Locale): string | null {
  const candidates = resolveLocaleCandidates(locale);
  for (const candidate of candidates) {
    try {
      return fs.readFileSync(getLocalizedPath(path.join(newsMarkdownDirRelPath, `${slug}.md`), candidate), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`Failed to read markdown for ${slug}`, error);
      }
    }
  }
  return null;
}
