# Navigation System Overview

This document explains how the multi‑locale navigation system works across caching layers, database models, admin APIs, and rendering.

## Purpose
- Build dynamic navigation trees from `Page` records grouped by locale and hierarchy.
- Support multi‑tier caching (in‑memory → Redis → Database) for performance.
- Maintain backwards compatibility with legacy `NavigationItem` table during migration.
- Enable flexible path building with three navigation kinds: `PAGE`, `ROUTE`, `LINK`.
- Support role‑based access control for visibility gating.

## Architecture Overview

### Three-Tier Caching Strategy
Navigation trees are cached at multiple levels to minimize database queries:

1. **In-Memory Cache (60s TTL)**
   - Fast local access, survives within a single server instance
   - Stored in `NAV_CACHE` Map with expiration timestamps
   - Used as first lookup before Redis

2. **Redis Cache (5min TTL)**
   - Distributed cache shared across server instances
   - Enables consistency in multi‑instance deployments
   - Optional; system gracefully falls back to in‑memory if Redis unavailable

3. **Database (PostgreSQL)**
   - Source of truth: `Page` records with `published=true`
   - Fallback to legacy `NavigationItem` table if no `Page` records exist

### Cache Versioning
- Version key (`NAV_CACHE_VERSION_KEY`) tracks cache validity state
- When admin edits trigger changes, version is bumped (`v{timestamp}`)
- All cache layers cleared; subsequent requests rebuild from database
- Ensures stale UI never serves post‑edit

## Data Model

### Page Model (Primary)
See [prisma/schema.prisma](../prisma/schema.prisma)

```prisma
model Page {
  id           String
  slug         String          // Local path segment (e.g., "about")
  locale       String          // "bg" or "en"
  groupId      String?         // Links locale variants of same logical node
  parentId     String?         // Hierarchy: parent page
  order        Int             // Sibling ordering
  visible      Boolean         // Navigation visibility toggle
  navLabel     String?         // Optional label override for nav display
  externalUrl  String?         // External URL when kind=LINK
  routePath    String?         // Base route when kind=ROUTE
  routeOverride String?        // Absolute route override
  accessRole   Role?           // Role gating (ADMIN, USER, etc.)
  kind         PageKind        // PAGE | ROUTE | LINK | FOLDER
  published    Boolean         // Admin publish status
  @@unique([slug, locale])
}

enum PageKind {
  PAGE    // Standard content page
  LINK    // External URL only
  FOLDER  // Grouping node without content
  ROUTE   // References existing app route
}
```

### NavigationItem Model (Legacy)
```prisma
model NavigationItem {
  id          String
  parentId    String?         // Hierarchy
  order       Int             // Sibling ordering
  slug        String?         // Internal link or external URL
  visible     Boolean
  accessRole  Role?
  labels      Json            // { "bg": "...", "en": "..." }
}
```

**Migration Path**: New CMS uses `Page` records. `NavigationItem` remains active but is checked only if no `Page` records exist (backwards compatibility during rollout).

## Navigation Building Process

### Grouping Algorithm (Key Pattern)
See [lib/navigation-build.ts](../lib/navigation-build.ts) → `buildGroupedTree()`

1. **Group by `groupId`** (or `id` if no `groupId`)
   - Each group contains all locale variants of the same logical node
   - Example: Group "home" contains `Page{slug:"home", locale:"bg", groupId:"home"}` + `Page{slug:"home", locale:"en", groupId:"home"}`

2. **Select Best Variant for Requested Locale**
   - Prioritize requested locale variant (e.g., requested `locale="en"`, pick English row)
   - Fallback to default locale variant if missing
   - Use first available if both missing (rare)

3. **Canonical Ordering**
   - All locale variants of same group share one ordering
   - Order taken from default locale row; other locales' orders ignored
   - Ensures consistent menu structure across all languages

4. **Build Tree**
   - Parent-child links via `parentId`
   - Root nodes have no parent
   - Children sorted by canonical order; recursively sort sub-children

### Path Building (Three Kinds)

#### KIND = PAGE (Standard Content)
```
Input:  Page { slug: "about/team", locale: "bg", kind: PAGE }
Output: href = "/about/team"
```
- Slug becomes URL path segment
- Multi-segment slugs (e.g., "about/team") supported
- `navLabel` overrides display text

#### KIND = ROUTE (App Route Reference)
```
Input:  Page { 
  slug: "news", 
  routePath: "app/news", 
  kind: ROUTE 
}
Output: href = "/news"

// With dynamic segments:
Input:  Page { 
  slug: "[id]", 
  routePath: "app/posts/[id]",  // Supports [param] or [...param]
  kind: ROUTE 
}
Output: href = "/posts/[id]" (for client-side dynamic routing)
```
- `routePath` defines base app route (e.g., "app/news", normalized to "news")
- Slug fills dynamic segments `[param]` or `[...param]`
- `routeOverride` replaces computed href if needed

#### KIND = LINK (External URL)
```
Input:  Page { 
  externalUrl: "https://example.com", 
  kind: LINK 
}
Output: href = "https://example.com", external = true
```
- No slug processing; URL used as-is
- Rendered with `target="_blank"` or similar
- No sub-pages (LINK is leaf node)

#### KIND = FOLDER (Structural Grouping)
```
Input:  Page { 
  slug: "products", 
  kind: FOLDER 
}
Output: href = undefined (no clickable link)
```
- Used for menu grouping without a landing page
- Children inherit parent for hierarchical display
- Useful for expanding menus with multiple sub-items

## Public Read Flow

### Endpoint: `getNavigationTree(locale, options?)`
See [lib/navigation-build.ts](../lib/navigation-build.ts)

```typescript
interface NavigationResult {
  items: UiNavNode[];      // Rendered tree
  legacy: boolean;         // True if built from NavigationItem
}

const result = await getNavigationTree("en", { 
  forceRefresh: false,     // Skip cache if true
  role: "ADMIN"            // Optional role gating
});
```

**Cache Lookup Order**:
1. Check in‑memory cache (if not expired)
2. Check Redis cache (if available)
3. Query database
4. Write back to both cache layers

**Rendering Output**:
```typescript
interface UiNavNode {
  label: string;
  href?: string;           // Undefined for FOLDER
  external?: boolean;
  children?: UiNavNode[];
  kind?: string;           // PAGE | ROUTE | LINK | FOLDER
}
```

### Role-Based Visibility
- If `Page.accessRole` is set, only users with that role see the node
- Filtered post-tree-build via `filterAccessible(nodes, role)`
- Children of hidden parents also hidden

### Locale Fallback
- Requested locale preferred; default locale fallback automatic
- If zero published pages for requested locale, displays zero items (not default fallback)
- Per-locale caching ensures each locale cached separately

## Admin API

### Endpoints
- **GET `/api/admin/pages?locale=&q=&slug=&groupId=`**
  - Returns page list for locale (search by title/slug)
  - Used to populate admin UI table

- **POST `/api/admin/pages`**
  - Creates new page; assigns new `groupId` (same as `id` initially)
  - Request body: `{ slug, locale, title, bodyMarkdown?, blocks?, published? }`
  - Returns `{ id }` with `201` status

- **PUT `/api/admin/pages/:id`**
  - Updates page; supports locale switching via `groupId` query
  - Request body: partial update fields
  - Returns `{ id }` with `200` status

- **DELETE `/api/admin/pages/:id`**
  - Soft delete (marks `published=false`) or hard delete
  - Returns `204` No Content

- **POST `/api/admin/pages/:id/navigate`**
  - Reorder/reparent pages; accepts `{ parentId?, order? }`
  - Invalidates navigation tree on success
  - Used by drag-and-drop reordering UI

### Cache Invalidation Triggers
All admin mutations trigger `invalidateNavigationTree(locale?)`:
```typescript
// After page create/update/delete:
await invalidateNavigationTree(locale);  // Invalidate specific locale
await invalidateNavigationTree();        // Invalidate all locales
```

**Flow**:
1. Bump version (`v{timestamp}`)
2. Clear in‑memory `NAV_CACHE`
3. Delete Redis entries with old version
4. Subsequent requests rebuild from database with new version

## Admin UI

### Navigation Manager
File: `app/admin/navigation/page.tsx`

**Features**:
- Hierarchical tree view (expand/collapse nodes)
- Drag-and-drop reordering with parent reassignment
- Inline editing: label, visibility toggle, access role
- Locale switcher (shows same logical node's variants across locales)
- Bulk publish/unpublish actions

**Draft Buffering**: Changes held client-side until "Publish" clicked; hitting other sections discards edits.

### Page Editor Integration
When editing a page, admin can configure:
- **Slug**: Unique per locale (validated against collisions)
- **NavLabel**: Override display text in navigation
- **Kind**: Select PAGE | ROUTE | LINK | FOLDER
- **Parent**: Reassign hierarchy
- **Order**: Manual ordering within siblings
- **Visible**: Toggle navigation visibility (can be published but hidden)
- **AccessRole**: Restrict to specific roles

## Common Workflows

### Add a New Navigation Item
1. Admin creates `Page` record:
   ```
   { slug: "about", locale: "bg", title: "За нас", published: true, visible: true }
   ```
2. System assigns `groupId = id`
3. Cache invalidated; tree rebuilt next request
4. Item appears in nav immediately

### Localize Existing Item
1. Admin creates second `Page` with same `slug` + `groupId`:
   ```
   { slug: "about", locale: "en", title: "About", groupId: "home-group-id", published: true }
   ```
2. Both locale variants now share same tree position
3. Each locale independently selects its variant for rendering
4. Cache invalidated; trees rebuilt

### Switch to Page Records (Migration)
1. Admin creates all desired `Page` records
2. System queries `Page` first in `buildNavigation()`
3. If pages found, uses them; ignores `NavigationItem`
4. When ready, `NavigationItem` can be archived (soft-deleted from DB)

### Reorder / Reparent
1. Admin drags node in UI
2. Request `POST /api/admin/pages/:id/navigate` with new `{ parentId, order }`
3. Page updated in DB
4. Cache invalidated; subsequent renders show new tree
5. UI immediately refreshes (optimistic update)

## Error Handling

### Slug Collision
- Unique constraint on `(slug, locale)` prevents duplicates within same locale
- Different locales can share slug (expected behavior for variants)
- Reserved slugs rejected: `api`, `admin`, `one-time`, `auth`

### Reserved Segments
- Top-level slug segments `api`, `admin`, `one-time`, `auth` rejected
- News URL collision: If page slug starts with `novini/`, checks if news post exists
- Prevents accidental URL shadowing

### Circular Parent References
- Prevented by Prisma schema (no circular FK; database enforces)
- Admin UI can validate before submit

### Cache Miss Handling
- If Redis unavailable, falls back to in-memory cache
- If both empty, queries database on each request (degraded performance)
- Admin edits still invalidate immediately (version bumped in memory)

## Environment Variables
- `REDIS_URL`: Optional; enables Redis caching (gracefully falls back if unset)
- `NEXTAUTH_SECRET`: Required for JWT signing (auth guard on admin APIs)

## Performance Notes

### Query Optimization
- Critical index: `(locale, parentId, slug)` for hierarchical path resolution
- Composite index `(locale, published)` for filtering
- Avoids N+1 queries; single `findMany` with sorting

### Cache Hit Rate
- Typical scenario: ~99% in-memory cache hits within 60s window
- Redis cache bridges multi-instance deployments (~5min across restarts)
- Database queries infrequent unless cache invalidated or version bumped

### Fallback Performance
- Legacy `NavigationItem` queries slower (no locale-aware indexes)
- Recommend migrate to `Page` records for scale

## Extensibility

### Future Enhancements
- Conditional visibility (e.g., show only to authenticated users)
- Menu grouping styles (e.g., mega-menu, sidebar collapsible)
- Analytics: track most-clicked nav items
- SEO: auto-sitemap generation from nav tree
- Soft-delete with archive/restore workflows

## Key Files
- Navigation builder: [lib/navigation-build.ts](../lib/navigation-build.ts)
- Redis client: [lib/redis.ts](../lib/redis.ts)
- Prisma schema: [prisma/schema.prisma](../prisma/schema.prisma)
- Admin UI: `app/admin/navigation/page.tsx`
- Admin API: `app/api/admin/pages/route.ts`
- Types: [lib/types.ts](../lib/types.ts)
