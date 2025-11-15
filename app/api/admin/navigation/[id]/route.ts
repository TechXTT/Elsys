import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.id || (session.user as any)?.role !== "ADMIN") {
    throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const existing = await (prisma as any).page.findUnique({ where: { id: params.id }, select: { parentId: true, locale: true, groupId: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = (await req.json().catch(() => null)) as {
      parentId?: string | null;
      order?: number;
      slug?: string | null;
      externalUrl?: string | null;
      routePath?: string | null;
      routeOverride?: string | null;
      visible?: boolean;
      accessRole?: string | null;
      navLabel?: string | null;
      kind?: string | null;
    } | null;
    if (!body) return NextResponse.json({ error: 'Missing body' }, { status: 400 });
    // Determine if structural update is requested
    const structuralKeys = ['parentId','order','kind','visible','externalUrl'];
    const isStructural = structuralKeys.some(k => Object.prototype.hasOwnProperty.call(body, k));

    if (!isStructural) {
      // Locale-specific update (slug, navLabel, accessRole)
      const data: any = {};
      if (body.slug !== undefined) data.slug = body.slug;
      if (body.navLabel !== undefined) data.navLabel = body.navLabel;
      if (body.accessRole !== undefined) data.accessRole = body.accessRole;
      if (body.routePath !== undefined) data.routePath = body.routePath;
      if (body.routeOverride !== undefined) data.routeOverride = body.routeOverride;
      await (prisma as any).page.update({ where: { id: params.id }, data });
      return NextResponse.json({ ok: true });
    }

    // Structural update: propagate to all locales in the same group
    const siblings = await (prisma as any).page.findMany({ where: { groupId: existing.groupId }, select: { id: true, locale: true, parentId: true } });
    // If parentId changes, map to per-locale parent using its groupId
    let parentGroupId: string | null = null;
    if (Object.prototype.hasOwnProperty.call(body, 'parentId')) {
      if (body.parentId) {
        const parent = await (prisma as any).page.findUnique({ where: { id: body.parentId }, select: { groupId: true } });
        parentGroupId = parent?.groupId ?? null;
      } else {
        parentGroupId = null;
      }
    }
    await (prisma as any).$transaction(async (tx: any) => {
      for (const s of siblings) {
        let mappedParentId: string | null | undefined = undefined;
        if (Object.prototype.hasOwnProperty.call(body, 'parentId')) {
          if (parentGroupId === null) mappedParentId = null; else {
            const parentLoc = await tx.page.findFirst({ where: { groupId: parentGroupId, locale: s.locale }, select: { id: true } });
            mappedParentId = parentLoc?.id ?? null;
          }
        }
        const data: any = {};
        if (mappedParentId !== undefined) data.parentId = mappedParentId;
        if (body.order !== undefined) data.order = body.order;
        if (body.visible !== undefined) data.visible = !!body.visible;
        if (body.kind !== undefined) data.kind = body.kind;
        if (body.externalUrl !== undefined) data.externalUrl = body.externalUrl;
        await tx.page.update({ where: { id: s.id }, data });
      }
    });
    // Also apply locale-specific fields if provided together with structural ones (only to the targeted page id)
    if (body.slug !== undefined || body.navLabel !== undefined || body.accessRole !== undefined || body.routePath !== undefined || body.routeOverride !== undefined) {
      const perLocale: any = {};
      if (body.slug !== undefined) perLocale.slug = body.slug;
      if (body.navLabel !== undefined) perLocale.navLabel = body.navLabel;
      if (body.accessRole !== undefined) perLocale.accessRole = body.accessRole;
      if (body.routePath !== undefined) perLocale.routePath = body.routePath;
      if (body.routeOverride !== undefined) perLocale.routeOverride = body.routeOverride;
      await (prisma as any).page.update({ where: { id: params.id }, data: perLocale });
    }
    // Normalize orders per locale for affected parents
    const locales = Array.from(new Set(siblings.map((s:any)=>s.locale)));
    // Normalize new parent
    for (const loc of locales) {
      const parentId = parentGroupId === null ? null : (parentGroupId ? (await (prisma as any).page.findFirst({ where: { groupId: parentGroupId, locale: loc }, select: { id: true } }))?.id ?? null : null);
      await normalizeParentOrders(parentId, loc);
    }
    // Normalize old parent as well (if parent changed)
    if (Object.prototype.hasOwnProperty.call(body, 'parentId')) {
      const oldParent = existing.parentId ? await (prisma as any).page.findUnique({ where: { id: existing.parentId }, select: { groupId: true } }) : null;
      const oldParentGroupId = oldParent?.groupId ?? null;
      for (const loc of locales) {
        const parentId = oldParentGroupId === null ? null : (oldParentGroupId ? (await (prisma as any).page.findFirst({ where: { groupId: oldParentGroupId, locale: loc }, select: { id: true } }))?.id ?? null : null);
        await normalizeParentOrders(parentId, loc);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('/api/admin/navigation/[id] PUT error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    ensureAdmin(session);
    const existing = await (prisma as any).page.findUnique({ where: { id: params.id }, select: { parentId: true, locale: true, groupId: true } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const groupId = existing.groupId;
    // Delete subtree across locales: find all nodes whose groupId is in the subtree
    const all = await (prisma as any).page.findMany({ select: { id: true, parentId: true, groupId: true } });
    const byId = new Map(all.map((p:any)=>[p.id,p]));
    const toDeleteGroupIds = new Set<string>();
    function collectGroups(id: string) {
      const node = byId.get(id); if (!node) return;
      toDeleteGroupIds.add(node.groupId);
      for (const child of all) { if (child.parentId === id) collectGroups(child.id); }
    }
    collectGroups(params.id);
    await (prisma as any).page.deleteMany({ where: { groupId: { in: Array.from(toDeleteGroupIds) } } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('/api/admin/navigation/[id] DELETE error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function normalizeParentOrders(parentId: string | null, locale: string) {
  const where = parentId === null ? { parentId: null as any, locale } : { parentId, locale };
  const siblings = await (prisma as any).page.findMany({ where, orderBy: { order: 'asc' }, select: { id: true } });
  const tx: any[] = [];
  siblings.forEach((s: any, i: number) => { tx.push((prisma as any).page.update({ where: { id: s.id }, data: { order: i } })); });
  if (tx.length) await (prisma as any).$transaction(tx);
}
