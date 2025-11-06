import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Recursively discover all index.json files under content/<locale>/** (excluding news/events)
const CONTENT_DIR = path.join(process.cwd(), "content");
const LOCALES = ["bg", "en"] as const;
const EXCLUDED_ROOTS = new Set(["news", "events"]);

function walkIndexJsonFiles(locale: string): string[] {
  const base = path.join(CONTENT_DIR, locale);
  const out: string[] = [];
  function walk(rel: string) {
    const abs = path.join(base, rel);
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const childRel = path.join(rel, entry.name);
      const top = childRel.split(path.sep)[0];
      if (EXCLUDED_ROOTS.has(top)) continue;
      if (entry.isDirectory()) {
        walk(childRel);
      } else if (entry.isFile() && entry.name === "index.json") {
        out.push(path.join(base, childRel));
      }
    }
  }
  walk("");
  return out;
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session || session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1) Slugs from DB
    const dbPages = await (prisma as any).page.findMany({ select: { slug: true } }).catch(() => [] as { slug: string }[]);
    const slugs = new Set<string>(dbPages.map((p: any) => p.slug).filter(Boolean));

    // 2) Slugs from filesystem content index.json entries
    for (const locale of LOCALES) {
      const files = walkIndexJsonFiles(locale);
      for (const fileAbs of files) {
        try {
          const raw = fs.readFileSync(fileAbs, "utf8");
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            for (const item of arr) {
              const href = (item?.href || "").trim();
              if (!href) continue;
              const clean = href.startsWith("/") ? href.slice(1) : href;
              const top = clean.split("/")[0];
              if (EXCLUDED_ROOTS.has(top)) continue;
              slugs.add(clean);
            }
          }
        } catch {
          // ignore bad JSON
        }
      }
    }

    const list = Array.from(slugs).sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ slugs: list });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to list slugs" }, { status: 500 });
  }
}
