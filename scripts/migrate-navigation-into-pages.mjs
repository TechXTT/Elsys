#!/usr/bin/env node
/**
 * Migration script: merge NavigationItem tree into unified Page model.
 *
 * Steps (idempotent-ish):
 * 1. Load NavigationItem rows and build tree.
 * 2. For each locale, project tree nodes onto Pages:
 *    - For internal items (slug && !externalUrl): find matching Page(s) whose slug currently holds full path.
 *      Split full slug by '/' to compute segment + ancestors. Create missing ancestor FOLDER pages as needed.
 *    - For external links: create LINK pages per locale with externalUrl + navLabel.
 *    - For folder nodes (no slug/externalUrl): create FOLDER pages per locale.
 * 3. Update existing Pages: convert full path slug -> last segment; set parentId/order/visible/navLabel/kind.
 * 4. Report actions; NO deletion of NavigationItem (manual cleanup after verification).
 *
 * Safety: Run in staging first; review output.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('[merge-nav] starting');
  const navItems = await prisma.navigationItem.findMany({
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
  });
  const byId = new Map();
  navItems.forEach(n => byId.set(n.id, { ...n, children: [] }));
  const roots = [];
  navItems.forEach(n => {
    const node = byId.get(n.id);
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(node); else roots.push(node);
  });
  const localeSet = new Set();
  const pages = await prisma.page.findMany({ select: { id: true, slug: true, locale: true } });
  pages.forEach(p => localeSet.add(p.locale));
  const locales = [...localeSet];

  // Helper caches
  const createdAncestorCache = new Map(); // key: locale+fullPath -> { id, groupId }

  function splitPath(full) { return full.split('/').filter(Boolean); }

  function ancestorGroupForPath(path) {
    return `A|${path}`;
  }

  function nodeGroup(nodeId) {
    return `G|${nodeId}`;
  }

  async function ensureAncestorChain(segments, locale) {
    let parentId = null;
    let parentGroupId = null;
    for (let i = 0; i < segments.length - 1; i++) {
      const path = segments.slice(0, i + 1).join('/');
      const cacheKey = locale + '|' + path;
      if (createdAncestorCache.has(cacheKey)) { const cached = createdAncestorCache.get(cacheKey); parentId = cached.id; parentGroupId = cached.groupId; continue; }
      // Try find existing page with legacy full path slug
      const existing = await prisma.page.findUnique({ where: { slug_locale: { slug: path, locale } } }).catch(() => null);
      let ancestorPage = existing;
      const groupId = ancestorGroupForPath(path);
      if (!ancestorPage) {
        ancestorPage = await prisma.page.create({
          data: {
            slug: path,
            locale,
            title: segments[i],
            kind: 'FOLDER',
            parentId,
            order: 0,
            visible: true,
            groupId,
          },
        });
        console.log('[merge-nav] created ancestor folder', locale, path, ancestorPage.id);
      } else {
        // Ensure parentId & groupId correct for existing ancestor
        const updates = {};
        if (ancestorPage.parentId !== parentId) Object.assign(updates, { parentId });
        if (ancestorPage.groupId !== groupId) Object.assign(updates, { groupId });
        if (Object.keys(updates).length) {
          await prisma.page.update({ where: { id: ancestorPage.id }, data: updates });
          console.log('[merge-nav] updated ancestor linkage/group', locale, path);
        }
      }
      createdAncestorCache.set(cacheKey, { id: ancestorPage.id, groupId });
      parentId = ancestorPage.id; parentGroupId = groupId;
    }
    return { parentId, parentGroupId };
  }

  // Process navigation items
  for (const root of roots) {
    await processNode(root, []);
  }

  async function processNode(node, ancestorSegments) {
    const labelMap = node.labels || {};
    const visible = !!node.visible;
    const children = node.children || [];
    const isExternal = !!node.externalUrl;
    const slug = (node.slug || '').trim();
    const hasInternalSlug = slug && !isExternal;
    const segments = hasInternalSlug ? splitPath(slug) : [];

    for (const locale of locales) {
      const navLabel = labelMap[locale] || segments.at(-1) || 'Folder';
      if (hasInternalSlug) {
        // Find page(s) matching full path legacy slug
        const existing = await prisma.page.findUnique({ where: { slug_locale: { slug, locale } } }).catch(() => null);
        if (existing) {
          const { parentId } = await ensureAncestorChain(segments, locale);
          // Update page to segment slug & hierarchy
          await prisma.page.update({
            where: { id: existing.id },
            data: {
              parentId,
              order: node.order,
              visible,
              navLabel,
              kind: 'PAGE',
              groupId: nodeGroup(node.id),
            },
          });
          // console.log('[merge-nav] updated page hierarchy', locale, slug, '-> segment', segment);
        } else {
          // Create new page
          const { parentId } = await ensureAncestorChain(segments, locale);
          const created = await prisma.page.create({
            data: {
              slug,
              locale,
              title: navLabel,
              parentId,
              order: node.order,
              visible,
              navLabel,
              kind: 'PAGE',
              excerpt: null,
              published: true,
              groupId: nodeGroup(node.id),
            },
          });
          console.log('[merge-nav] created missing internal page (full path slug)', locale, slug, created.id);
        }
      } else if (isExternal) {
        // External LINK
        const existingLink = await prisma.page.findUnique({ where: { slug_locale: { slug: slug || node.id, locale } } }).catch(() => null);
        if (!existingLink) {
          const created = await prisma.page.create({
            data: {
              slug: (slug || node.id), // stable identifier
              locale,
              title: navLabel,
              navLabel,
              kind: 'LINK',
              externalUrl: node.externalUrl,
              order: node.order,
              visible,
              published: true,
              groupId: nodeGroup(node.id),
            },
          });
          console.log('[merge-nav] created link page', locale, slug || node.id, created.id);
        }
      } else {
        // FOLDER
        const folderSlug = node.id.slice(0, 8); // synthetic short slug
        const existingFolder = await prisma.page.findUnique({ where: { slug_locale: { slug: folderSlug, locale } } }).catch(() => null);
        if (!existingFolder) {
          const created = await prisma.page.create({
            data: {
              slug: folderSlug,
              locale,
              title: navLabel,
              navLabel,
              kind: 'FOLDER',
              order: node.order,
              visible,
              published: true,
              groupId: nodeGroup(node.id),
            },
          });
          console.log('[merge-nav] created folder page', locale, folderSlug, created.id);
        }
      }
    }
    for (const child of children) {
      await processNode(child, [...ancestorSegments, slug]);
    }
  }

  console.log('[merge-nav] DONE (verify, then remove NavigationItem model).');
}

main().catch(err => { console.error(err); process.exit(1); });
