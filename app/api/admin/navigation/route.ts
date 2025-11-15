import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.id || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

function sortTree(nodes: any[]) { nodes.sort((a,b)=>a.order-b.order); nodes.forEach(n=> sortTree(n.children)); }

export async function GET(_req: Request) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    // Canonical structure: build by grouping across locales using groupId. Use 'bg' as primary structure when available.
    const all = await (prisma as any).page.findMany({
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
      select: { id: true, groupId: true, parentId: true, order: true, slug: true, externalUrl: true, routePath: true, routeOverride: true, visible: true, accessRole: true, navLabel: true, kind: true, locale: true }
    });
    const groups = new Map<string, any[]>();
    for (const p of all) {
      const gid = p.groupId ?? p.id; // fallback during transition
      if (!groups.has(gid)) groups.set(gid, []);
      groups.get(gid)!.push(p);
    }
    // Build nodes using primary locale page per group (prefer 'bg', else any)
    const nodesById = new Map<string, any>();
    const nodes: any[] = [];
    // map groupId -> chosen primary page
    const primaryByGroup = new Map<string, any>();
    for (const [gid, arr] of groups) {
      let primary = arr.find(x => x.locale === 'bg') || arr[0];
      // synthesize x-locale maps
      const idsByLocale: Record<string,string> = {};
      const slugByLocale: Record<string,string|null> = {};
      const labelByLocale: Record<string,string|null> = {};
      const routeOverrideByLocale: Record<string,string|null> = {};
      for (const v of arr) { idsByLocale[v.locale] = v.id; slugByLocale[v.locale] = v.slug; labelByLocale[v.locale] = v.navLabel; routeOverrideByLocale[v.locale] = v.routeOverride; }
      const node = { ...primary, idsByLocale, slugByLocale, labelByLocale, routeOverrideByLocale, children: [] as any[] };
      nodesById.set(primary.id, node);
      primaryByGroup.set(gid, node);
    }
    for (const node of nodesById.values()) {
      const primaryParent = node.parentId ? nodesById.get(node.parentId) : null;
      if (primaryParent) primaryParent.children.push(node); else nodes.push(node);
    }
    sortTree(nodes);
    return NextResponse.json({ items: nodes });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/navigation GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const body = (await req.json().catch(() => null)) as {
      locale?: string; // optional for creation; if omitted, create for all locales
      parentId?: string | null;
      slug?: string | null;
      externalUrl?: string | null;
      routePath?: string | null;
      routeOverride?: string | null;
      navLabel?: string | null;
      kind?: string | null;
      visible?: boolean;
      accessRole?: string | null;
      createAllLocales?: boolean;
    } | null;
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    if (body.kind === 'LINK' && !body.externalUrl) return NextResponse.json({ error: "External URL required for LINK" }, { status: 400 });
    if (body.kind === 'ROUTE' && !body.routePath) return NextResponse.json({ error: "routePath required for ROUTE" }, { status: 400 });
    if (body.kind !== 'LINK' && body.kind !== 'ROUTE' && !body.slug) return NextResponse.json({ error: "Slug segment required" }, { status: 400 });
    // Determine locales to create
    let locales: string[];
    if (body.createAllLocales) {
      // Import configured locales list lazily to avoid circulars
      const { locales: supportedLocales } = await import('@/i18n/config');
      locales = [...supportedLocales];
    } else if (body.locale) {
      locales = [body.locale];
    } else {
      const existingLocales = Array.from(new Set((await (prisma as any).page.findMany({ select: { locale: true } })).map((p:any)=> p.locale as string))) as string[];
      locales = existingLocales.length ? existingLocales : ['bg'];
    }
    if (locales.length === 0) locales.push('bg');
    const groupId = `G|${crypto.randomUUID()}`;
    // Map parentId by locale via parent's group id if provided
    let parentGroupId: string | null = null;
    if (body.parentId) {
      const p = await (prisma as any).page.findUnique({ where: { id: body.parentId }, select: { groupId: true } });
      parentGroupId = p?.groupId ?? null;
    }
    const createdIds: string[] = [];
    await (prisma as any).$transaction(async (tx: any) => {
      for (const loc of locales) {
        let parentId: string | null = null;
        if (parentGroupId) {
          const parentLoc = await tx.page.findFirst({ where: { groupId: parentGroupId, locale: loc }, select: { id: true } });
          parentId = parentLoc?.id ?? null;
        }
        const created = await tx.page.create({
          data: {
            locale: loc,
            parentId,
            slug: body.kind === 'LINK' ? (body.externalUrl || '') : (body.kind === 'ROUTE' ? (body.slug || '') : (body.slug || '')),
            externalUrl: body.kind === 'LINK' ? (body.externalUrl || null) : null,
            routePath: body.kind === 'ROUTE' ? (body.routePath || null) : null,
            routeOverride: body.routeOverride || null,
            navLabel: body.navLabel ?? null,
            kind: (body.kind ?? 'PAGE'),
            visible: body.visible ?? true,
            order: 9999,
            title: body.navLabel ?? body.slug ?? 'Untitled',
            published: true,
            groupId,
          },
          select: { id: true }
        });
        createdIds.push(created.id);
      }
    });
    // Normalize orders for each locale/parent
    for (const loc of locales) {
      const parentForLoc = parentGroupId ? (await (prisma as any).page.findFirst({ where: { groupId: parentGroupId, locale: loc }, select: { id: true } }))?.id ?? null : null;
      await normalizeParentOrders(null, parentForLoc, loc);
    }
    return NextResponse.json({ groupId }, { status: 201 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("/api/admin/navigation POST error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function normalizeParentOrders(_createdId: string | null, parentId: string | null, locale: string) {
  const where = parentId === null ? { parentId: null as any, locale } : { parentId, locale };
  const siblings = await (prisma as any).page.findMany({ where, orderBy: { order: 'asc' }, select: { id: true } });
  const tx: any[] = [];
  siblings.forEach((s: any, i: number) => {
    tx.push((prisma as any).page.update({ where: { id: s.id }, data: { order: i } }));
  });
  if (tx.length) await (prisma as any).$transaction(tx);
}
