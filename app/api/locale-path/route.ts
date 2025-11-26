import { NextResponse } from "next/server";

import { defaultLocale, locales } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

const VALID_LOCALES = new Set(locales);
const MAX_PARENT_TRAVERSAL = 32;

function normalizeLocale(value: string | null): string {
  if (value && VALID_LOCALES.has(value as any)) return value;
  return defaultLocale;
}

function stripSlashes(value: string | null) {
  return (value || "").trim().replace(/^\/+|\/+$/g, "");
}

async function findAliasMatch(locale: string, aliasSegment: string) {
  if (!aliasSegment) return null;
  return await (prisma as any).page.findFirst({
    where: {
      locale,
      kind: "ROUTE",
      routeOverride: { in: [aliasSegment, `/${aliasSegment}`] },
    },
    select: { id: true, groupId: true },
  }).catch(() => null);
}

async function findTargetByGroup(locale: string, groupId: string | null) {
  if (!groupId) return null;
  return await (prisma as any).page.findFirst({
    where: { locale, groupId },
    select: { id: true, slug: true, parentId: true, routeOverride: true },
  }).catch(() => null);
}

async function buildSlugPath(node: { id: string; slug: string | null; parentId: string | null }): Promise<string | null> {
  const segments: string[] = [];
  let cursor: { id: string; slug: string | null; parentId: string | null } | null = node;
  let safety = 0;
  while (cursor && safety++ < MAX_PARENT_TRAVERSAL) {
    if (cursor.slug) segments.push(cursor.slug);
    if (!cursor.parentId) break;
    const parent: { id: string; slug: string | null; parentId: string | null } | null = await (prisma as any).page.findUnique({
      where: { id: cursor.parentId },
      select: { id: true, slug: true, parentId: true },
    }).catch(() => null);
    if (!parent) break;
    cursor = parent;
  }
  if (!segments.length) return null;
  return segments.reverse().join("/");
}

async function findHierarchicalMatch(locale: string, segments: string[]) {
  if (!segments.length) return null;
  let parentId: string | null = null;
  let last: { id: string; groupId: string | null } | null = null;
  for (const seg of segments) {
    const node: { id: string; groupId: string | null } | null = await (prisma as any).page.findFirst({
      where: { locale, parentId, slug: seg },
      select: { id: true, groupId: true },
    }).catch(() => null);
    if (!node) return null;
    last = node;
    parentId = node.id;
  }
  return last;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fromLocale = normalizeLocale(searchParams.get("from"));
  const toLocale = normalizeLocale(searchParams.get("to"));
  const rawPath = stripSlashes(searchParams.get("path"));

  if (!rawPath) {
    return NextResponse.json({ target: "" });
  }

  const segments = rawPath.split("/").filter(Boolean);
  if (!segments.length) {
    return NextResponse.json({ target: "" });
  }

  const aliasHead = segments[0];
  const remainder = stripSlashes(segments.slice(1).join("/"));

  const aliasMatch = await findAliasMatch(fromLocale, aliasHead);
  if (aliasMatch?.groupId) {
    const target = await findTargetByGroup(toLocale, aliasMatch.groupId);
    const base = stripSlashes(target?.routeOverride || target?.slug || "");
    if (base) {
      const combined = [base, remainder].filter(Boolean).join("/");
      return NextResponse.json({ target: combined });
    }
  }

  const hierMatch = await findHierarchicalMatch(fromLocale, segments);
  if (hierMatch?.groupId) {
    const target = await findTargetByGroup(toLocale, hierMatch.groupId);
    if (target) {
      const built = await buildSlugPath(target);
      if (built) {
        return NextResponse.json({ target: built });
      }
    }
  }

  return NextResponse.json({ target: null });
}
