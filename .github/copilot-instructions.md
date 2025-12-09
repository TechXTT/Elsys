# Elsys Codebase Guide for AI Agents

A multilingual (Bulgarian/English) school website built with **Next.js 14 App Router**, **Prisma ORM**, **NextAuth**, and **Tailwind CSS**. Content is hybrid: static files in `content/{bg|en}` + database-backed CMS pages.

## Architecture Overview

### Monolithic Structure
- **Frontend**: Next.js App Router with localized routing via `next-intl`
- **Database**: PostgreSQL via Prisma (users, pages, news, navigation, audit logs)
- **Admin**: Protected routes (`app/admin/*`) requiring NextAuth sessions
- **Content Strategy**: Dual-source (JSON/Markdown files + Prisma Pages table)

### Key Data Flows
1. **Navigation**: Built from `Page` records grouped by locale/hierarchy → cached in Redis (5min TTL) + in-memory (1min fallback) → served to all routes
2. **Public Content**: Fallback chain: localized file → default locale file → error handling
3. **Admin Changes**: API writes to Prisma → cache invalidation via `bumpCacheVersion()` → Redis update → immediate UI refresh

### Localization Strategy
- **Locales**: "bg" (Bulgarian, default) and "en" (English)
- **Routing**: Always prefixed (`/bg/...`, `/en/...`) via `next-intl` middleware
- **Fallback**: Missing locale files cascade to default locale (`resolveLocaleCandidates()` in `lib/content.ts`)
- **Admin Labels**: Multilingual via `Json` fields (e.g., `NavigationItem.labels: { "bg": "...", "en": "..." }`)

## Critical Patterns

### Navigation Architecture (Most Complex)
See [lib/navigation-build.ts](../lib/navigation-build.ts)

- **Three-tier caching**: In-memory → Redis → Database
- **Legacy dual-mode**: Falls back to `NavigationItem` table if no `Page` records exist
- **Group-based rendering**: Same logical node (e.g., "About") can have locale variants (bg/en) with shared ordering
- **Path building**: Three kinds supported: `PAGE` (slug-based), `ROUTE` (dynamic app routes), `LINK` (external URLs)
- **Invalidation**: All cache layers cleared when CMS edits trigger `invalidateNavigationTree()` → bumps version key to cascade staleness

### Content Loading (Filesystem-First)
See [lib/content.ts](../lib/content.ts)

- **Locale candidates resolution**: Prioritizes requested locale, then default, returns first match
- **Lazy loading**: JSON parsed on-demand, Markdown files read when needed
- **Backwards compat**: News items can live in `content/bg/news/index.json` or database `NewsPost` table
- **No merge**: Always returns one source (not combined); database queries separate from file loading

### Admin Authentication
See [lib/auth.ts](../lib/auth.ts)

- **NextAuth + Credentials**: Email/password validation with bcrypt hashing
- **Bootstrap fallback**: If `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars set, auto-creates/syncs admin on first matching login
- **JWT enrichment**: Token includes `userId` and `role` for quick permission checks
- **Session persistence**: `PrismaAdapter` for database-backed sessions

### Admin API Pattern
See [app/api/admin/pages/route.ts](../app/api/admin/pages/route.ts)

```typescript
// Standard guard
function ensureAdmin(session: any): asserts session is { user: { id: string; role?: string } } {
  if (!session || !(session.user as any)?.role !== "ADMIN") throw NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Use in route handlers
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  ensureAdmin(session); // Throws 403 if not admin
  const userId = session!.user.id;
  // ... proceed with write
}
```

### Page Model Flexibility
See [prisma/schema.prisma](../prisma/schema.prisma)

The `Page` model supports multiple "kinds":
- **PAGE**: Standard editable content (blocks + markdown)
- **ROUTE**: References existing app routes (e.g., `/news`), href built via `routePath` + optional `routeOverride`
- **LINK**: External URLs only, no body content
- **FOLDER**: Structural grouping without content body

Each has `slug` (local segment), optional `parentId` (hierarchy), and locale variants via `groupId` linking.

## Developer Workflows

### Running the Project
```bash
pnpm dev              # Start dev server + Prisma client generation
pnpm build            # Build for production
pnpm prisma migrate dev  # Create/apply migrations
pnpm prisma db seed   # Run seed script
```

### Data Migration Scripts (in `scripts/`)
- `migrate-content-to-cms.mjs`: Moves filesystem content to Pages table
- `seed-navigation-from-static.mjs`: Populates NavigationItem from old static JSON
- `import-news-to-db.mjs`: Moves news JSON/MD to NewsPost table
- `migrate-navigation-into-pages.mjs`: Converts NavigationItem → Page records

**Pattern**: These are idempotent, check for existing data before inserting. Run sequentially during migration phases.

### Common Admin Tasks
1. **Edit/create page**: POST `/api/admin/pages` with `{ slug, locale, title, bodyMarkdown, blocks, published }`
2. **Update navigation**: Admin UI writes to `Page` records → auto-invalidates nav tree
3. **Publish news**: NewsPost records auto-indexed in admin UI
4. **View audit**: AuditLog table tracks all admin mutations (user, action, timestamp)

## Project-Specific Conventions

### File Organization
- **`app/[locale]/...`**: Public pages (auto-localized)
- **`app/admin/...`**: Protected admin UI (no locale prefix in URL)
- **`app/api/admin/...`**: RBAC-guarded endpoints
- **`app/api/...`**: Public APIs (route aliases, one-time secrets, locale paths)
- **`lib/*.ts`**: Server utilities (Prisma, content loaders, nav builder)
- **`components/admin/`**: Reusable admin widgets (BlockEditor, Panel)

### Prisma Usage
- Always use `(prisma as any)` type casts when dynamic schema access needed (rare; prefer typed queries)
- Migrations tracked in `prisma/migrations/`; seed runs `prisma/seed.js` post-install
- `PrismaAdapter` auto-manages NextAuth tables (sessions, accounts, verification tokens)

### Error Handling
- Admin APIs throw `NextResponse.json({ error: "..." }, { status: 4xx|5xx })`
- Content loaders return `null` on missing files (graceful degradation)
- Navigation builder has fallback to legacy `NavigationItem` if no Pages exist
- Audit logging captures all admin changes for compliance

### Environment Variables (Required)
- `PRISMA_DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: JWT signing secret
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: Bootstrap admin credentials (optional; used on first login only)
- `REDIS_URL`: Optional; enables distributed cache (falls back to in-memory if unset)

## Integration Points

### Third-Party Dependencies
- **`next-intl`**: Middleware-based i18n routing with locale detection
- **`next-auth`**: JWT + session management
- **`@prisma/client`**: ORM with automatic type generation
- **`ioredis`**: Distributed cache (gracefully optional)
- **`turndown`**: HTML-to-Markdown conversion for CMS imports
- **`cheerio`**: DOM parsing for scraping/import scripts

### Cache Invalidation Trigger Points
- Admin page create/update/delete → `invalidatePageCache()` + `invalidateNavigationTree(locale)`
- Navigation reorder → `invalidateNavigationTree()`
- Direct navigation table edits → no auto-invalidation (use API endpoints)

## Testing & Debugging

### Common Issues
- **Stale navigation UI**: Restart dev server or manually trigger `invalidateNavigationTree()` endpoint
- **Missing translations**: Check `content/{bg|en}/` fallback chain; verify `resolveLocaleCandidates()` logic
- **Auth failures**: Verify `NEXTAUTH_SECRET` is consistent; check browser cookies (`next-auth.session-token`)
- **Page not appearing**: Check `Page.visible=true` and `Page.published=true`; verify locale matches request

### Debug Helpers
- Admin audit log: `SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC`
- Redis cache keys: Prefix `nav-tree:v{timestamp}:{locale}`
- Prisma schema validation: `pnpm prisma validate`

## Adding New Features

### New Admin UI Page
1. Create route: `app/admin/[section]/page.tsx`
2. Guard with `getServerSession(authOptions)` + redirect if unauthorized
3. Create API endpoint: `app/api/admin/[section]/route.ts` with `ensureAdmin()` guard
4. Update sidebar nav in `app/admin/components/AdminNav.tsx`

### New Public Content Section
1. Add JSON structure to `content/{bg|en}/[section]/index.json` (or DB via admin)
2. Create loader in `lib/content.ts` (e.g., `loadSectionItems()`)
3. Render in layout/page component with locale parameter
4. Add to navigation tree (manually update Page records or NavigationItem)

### New Database Model
1. Add to `prisma/schema.prisma`
2. Create migration: `pnpm prisma migrate dev --name add_[model]`
3. Export Prisma client query helper in `lib/prisma.ts` if reused
4. Create API route(s) with admin guard if admin-only
