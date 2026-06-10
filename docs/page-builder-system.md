# Page Builder System Overview

This document explains how the block‑based page builder system works across data models, admin APIs, component rendering, and the visual editor.

## Purpose
- Enable non-technical admins to build page layouts using visual blocks
- Support mixed editing: block-based builder + raw Markdown fallback
- Maintain version history for draft management and rollback
- Provide flexible, extensible block registry for custom component types
- Integrate with CMS page publishing workflow

## Architecture Overview

### Dual Content Strategy
Pages support two content representation modes:

1. **Block-Based (`blocks: Json`)**
   - Visual editor stores structured `BlockContent[]` array
   - Each block has `type`, `id`, `props`, and optional `children`
   - Renderers map block types to React components
   - Enable drag-and-drop UI builder

2. **Markdown (`bodyMarkdown: string`)**
   - Raw Markdown fallback for complex formatting
   - Renders via `react-markdown` with custom plugins
   - Useful for migration, bulk edits, versioning
   - Can coexist with blocks (blocks take precedence on render)

**Rendering Priority**: If `blocks` exists and non-empty, render blocks; otherwise render Markdown.

## Data Model

### Page Model (Content Storage)
See [prisma/schema.prisma](../prisma/schema.prisma)

```prisma
model Page {
  id           String
  slug         String        // URL path segment
  locale       String        // "bg" or "en"
  title        String        // Page title
  excerpt      String?       // SEO/card description
  bodyMarkdown String?       // Raw Markdown fallback
  blocks       Json?         // Block array: BlockContent[]
  published    Boolean       // Publish status
  authorId     String?       // Creator user ID
  currentVersionId String?   // Pointer to current published version
  versions     PageVersion[] // Full version history

  @@unique([slug, locale])
}

model PageVersion {
  id          String
  pageId      String
  page        Page    @relation(fields: [pageId], references: [id], onDelete: Cascade)
  version     Int     // Auto-incrementing version number
  title       String
  excerpt     String?
  bodyMarkdown String?
  blocks      Json?
  published   Boolean
  createdById String?
  createdBy   User?   @relation(fields: [createdById], references: [id])
  createdAt   DateTime

  @@index([pageId, version])
}
```

### Block Content Schema
Each block is structured as:

```typescript
interface BlockContent {
  id: string;           // Unique within page (UUID or hash)
  type: string;         // Registered block type (e.g., "hero", "text", "image-gallery")
  props: Record<string, any>;  // Block-specific properties
  children?: BlockContent[];   // Nested blocks (optional)
}
```

**Example Block Array**:
```json
[
  {
    "id": "block-1",
    "type": "hero",
    "props": {
      "title": "Welcome",
      "subtitle": "Learn more about us",
      "backgroundImage": "https://...",
      "cta": { "label": "Get Started", "href": "/contact" }
    }
  },
  {
    "id": "block-2",
    "type": "text",
    "props": {
      "markdown": "## Section Title\nSome content...",
      "alignment": "left"
    }
  },
  {
    "id": "block-3",
    "type": "image-gallery",
    "props": {
      "images": [
        { "src": "image1.jpg", "alt": "Alt text", "caption": "Caption" },
        { "src": "image2.jpg", "alt": "Alt text" }
      ],
      "layout": "grid",
      "columns": 3
    }
  }
]
```

## Block Registry

### Extensible Type System
See [lib/blocks/registry.tsx](../lib/blocks/registry.tsx)

```typescript
interface BlockDefinition {
  type: string;              // Unique identifier
  label: string;             // Display name in UI
  description?: string;      // Help text
  category: "layout" | "content" | "media" | "form" | "advanced";
  thumbnail?: string;        // Preview image
  defaultProps: Record<string, any>;  // Initial block props
  schema: Record<string, PropertySchema>;  // Validation + UI hints
  Component: React.ComponentType<{ props: any; children?: React.ReactNode }>;
}

interface PropertySchema {
  type: "string" | "number" | "boolean" | "select" | "rich-text" | "image" | "object" | "array";
  label: string;
  description?: string;
  required?: boolean;
  default?: any;
  options?: Array<{ value: any; label: string }>;  // For select
  min?: number;
  max?: number;
  pattern?: string;  // For regex validation
}
```

### Built-In Blocks (Example)
```typescript
export const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
  hero: {
    type: "hero",
    label: "Hero Section",
    category: "layout",
    defaultProps: {
      title: "Untitled Hero",
      subtitle: "",
      backgroundImage: null,
      cta: null,
    },
    schema: {
      title: { type: "string", label: "Title", required: true },
      subtitle: { type: "string", label: "Subtitle" },
      backgroundImage: { type: "image", label: "Background" },
      cta: {
        type: "object",
        label: "Call to Action",
        properties: {
          label: { type: "string" },
          href: { type: "string" },
        },
      },
    },
    Component: HeroBlock,
  },
  text: {
    type: "text",
    label: "Text Section",
    category: "content",
    defaultProps: {
      markdown: "Start typing...",
      alignment: "left",
    },
    schema: {
      markdown: { type: "rich-text", label: "Content", required: true },
      alignment: { type: "select", label: "Alignment", options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ]},
    },
    Component: TextBlock,
  },
  // ... more blocks
};
```

### Adding New Block Types
1. **Define Block Component**:
   ```typescript
   function MyCustomBlock({ props }: { props: Record<string, any> }) {
     return <div>{props.title}</div>;
   }
   ```

2. **Register in Registry**:
   ```typescript
   BLOCK_REGISTRY["my-custom"] = {
     type: "my-custom",
     label: "My Custom Block",
     category: "content",
     defaultProps: { title: "Default" },
     schema: {
       title: { type: "string", label: "Title", required: true },
     },
     Component: MyCustomBlock,
   };
   ```

3. **Block automatically appears in editor's "Add Block" menu**

## Admin UI: Block Editor

### File Structure
- Editor shell: `app/admin/pages/PageEditorShell.tsx`
- Block editor component: `components/admin/BlockEditor.tsx`
- Editor hooks: `app/admin/pages/hooks/usePageEditor.ts`

### Editor Features

#### Visual Block Management
- **Add Block**: Right-click or use toolbar → select from category menu
- **Delete Block**: Select block → press Delete or click trash icon
- **Reorder**: Drag handles or arrow keys (↑/↓)
- **Duplicate**: Copy existing block with Ctrl/Cmd+D
- **Expand/Collapse**: Click arrow to toggle block details

#### Property Editing
- **Props Inspector**: Right panel updates based on selected block type
- **Real-Time Validation**: Schema enforced; errors shown inline
- **Rich Text Editor**: For Markdown props with preview
- **Image Picker**: Upload or select from CMS image library
- **Nested Properties**: Support for object/array schemas (expand inline)

#### Version & Draft Management
- **Auto-Save**: Changes buffered in-memory; explicit "Save Draft" button
- **Publish**: Toggle `published` flag
- **Version History**: List prior versions; click to restore
- **Markdown Fallback**: Toggle to edit raw Markdown if blocks fail render

#### Block Preview
- **Live Preview**: Right panel shows rendered block as it appears on public site
- **Locale-Aware**: Preview updates for current locale
- **Responsive**: Shows mobile/tablet/desktop breakpoints

### Editor Workflow
1. Admin navigates to page editor
2. Loads current page's `blocks` and `bodyMarkdown`
3. Editor renders block array as draggable list
4. Admin edits blocks:
   - Click block → props panel updates
   - Change props → preview updates real-time
   - Drag to reorder
5. Admin publishes or saves draft
6. Request sent to `/api/admin/pages/:id` with updated `blocks` JSON
7. Page record updated; version snapshot created if published
8. Cache invalidated; public site reflects changes on next load

## Admin API

### Endpoints for Block Content

#### GET `/api/admin/pages/:id?locale=`
Fetches page with full content:
```json
{
  "id": "page-123",
  "slug": "home",
  "locale": "bg",
  "title": "Начало",
  "excerpt": "Welcome",
  "bodyMarkdown": "# Optional Markdown",
  "blocks": [ /* BlockContent[] */ ],
  "published": true,
  "currentVersionId": "version-456",
  "versions": [ /* PageVersion[] */ ]
}
```

#### PUT `/api/admin/pages/:id`
Updates page content:
```json
{
  "title": "Updated Title",
  "blocks": [ /* BlockContent[] */ ],
  "bodyMarkdown": "Optional updated markdown",
  "published": true
}
```

**Backend Logic**:
- Validates block structure (all types registered)
- Stores `blocks` as JSON in Prisma
- If `published=true`, creates `PageVersion` snapshot
- Invalidates page cache and navigation tree if published

#### GET `/api/admin/pages/:id/versions`
Lists version history:
```json
[
  { "id": "v1", "version": 1, "title": "...", "createdAt": "2026-01-01", "createdBy": { "name": "Admin" } },
  { "id": "v2", "version": 2, "title": "...", "createdAt": "2026-01-02", "createdBy": { "name": "Admin" } }
]
```

#### POST `/api/admin/pages/:id/versions/:versionId/restore`
Restores page to specific version:
- Copies version's `blocks`, `bodyMarkdown`, `title`, etc. to current page
- Creates new version (increments counter)
- Marks as unpublished draft
- Returns updated page

#### GET `/api/blocks/registry`
Public endpoint returning available block types:
```json
{
  "blocks": [
    {
      "type": "hero",
      "label": "Hero Section",
      "category": "layout",
      "schema": { /* PropertySchema */ }
    },
    /* ... more blocks */
  ]
}
```

## Public Rendering

### Page Component
File: `app/[locale]/[...slug]/page.tsx`

```typescript
export default async function Page({ params }: { params: { locale: string; slug: string[] } }) {
  const slug = params.slug.join("/");
  const page = await getPage(slug, params.locale);

  if (!page) notFound();
  if (!page.published) notFound();  // Drafts hidden

  return (
    <article>
      <h1>{page.title}</h1>
      {page.excerpt && <p className="lead">{page.excerpt}</p>}
      
      {/* Render blocks if present, else markdown */}
      {page.blocks && page.blocks.length > 0 ? (
        <BlockRenderer blocks={page.blocks} locale={params.locale} />
      ) : (
        <MarkdownRenderer content={page.bodyMarkdown} />
      )}
    </article>
  );
}
```

### Block Renderer
```typescript
function BlockRenderer({ blocks, locale }: { blocks: BlockContent[]; locale: string }) {
  return (
    <>
      {blocks.map((block) => {
        const def = BLOCK_REGISTRY[block.type];
        if (!def) return <UnknownBlockPlaceholder type={block.type} key={block.id} />;
        
        const Component = def.Component;
        return (
          <Component
            key={block.id}
            props={block.props}
            children={block.children ? <BlockRenderer blocks={block.children} locale={locale} /> : undefined}
          />
        );
      })}
    </>
  );
}
```

### Unknown Block Handling
- If block type not in registry (e.g., block removed after deployment)
- Render fallback placeholder or skip (admin-configurable)
- Log warning for debugging
- Ensures partial failures don't break page

## Version Management & Drafts

### Publishing Flow
1. Admin edits page (blocks or markdown)
2. Clicks "Save as Draft" → updates page, no version snapshot
3. Or clicks "Publish" → updates page, creates `PageVersion` with `published=true`
4. `currentVersionId` pointer set to published version
5. Public site immediately reflects changes (cache invalidated)

### Draft Lifecycle
- Drafts not published until admin explicitly clicks "Publish"
- Multiple locales can have different publish states independently
- Reverting to prior version marked as draft; requires explicit re-publish

### Version History Snapshot
```prisma
model PageVersion {
  id: String
  pageId: String
  version: Int           // 1, 2, 3, ...
  title: String
  blocks: Json           // Snapshot of blocks at publish time
  bodyMarkdown: String   // Snapshot of markdown at publish time
  published: Boolean     // Always true (only published versions saved)
  createdById: String    // Admin who published
  createdAt: DateTime
}
```

**Pattern**: Each publish creates immutable snapshot; enables rollback/audit trail.

## Common Workflows

### Create a New Page with Blocks
1. Admin navigates to admin → Pages → Create
2. Enters slug, locale, title
3. Clicks "Add Block" → selects "Hero Section"
4. Fills hero props: title, subtitle, background image
5. Clicks "Add Block" → selects "Text Section"
6. Edits markdown: "## Our Story\n..."
7. Clicks "Publish"
8. Page appears on public site immediately

### Add Block to Existing Page
1. Admin opens existing page in editor
2. Scrolls to position where block should appear
3. Right-clicks or uses "Insert Block Above/Below"
4. Selects block type from menu
5. Block inserted with default props
6. Edits props in right panel
7. Clicks "Save Draft" or "Publish"

### Restore Previous Version
1. Admin opens page editor
2. Clicks "Version History" tab
3. Sees list of past published versions with timestamps
4. Clicks version to preview
5. Clicks "Restore This Version"
6. Page reverts to that block array; marked as draft
7. Admin can review and re-publish or edit further

### Migrate from Markdown to Blocks
1. Admin has page with long `bodyMarkdown`
2. Creates new blocks manually in UI, or uses "Import Markdown" tool
3. Tool parses Markdown → generates text blocks (one per heading section)
4. Admin reviews; cleans up/restructures as needed
5. Clicks "Publish"
6. Old markdown preserved in version history

### Fallback to Markdown Editing
1. Editor fails to render blocks (corrupted JSON, unknown block types)
2. Admin clicks "Edit as Markdown" toggle in toolbar
3. Raw `bodyMarkdown` field becomes visible
4. Admin edits Markdown directly
5. On next page load, if blocks still invalid, Markdown renders instead
6. Blocks remain in DB (can be fixed later)

## Error Handling

### Invalid Block Structure
- Blocks must have `id`, `type`, `props`
- On render, unknown type → skip or placeholder
- On save, validation enforces required props per schema
- Malformed JSON → returns 400 Bad Request from API

### Missing Block Type (Post-Deploy Removal)
- Block type removed from registry but old pages still reference it
- Public render: shows placeholder + warning
- Admin edit: flags in UI; suggests update or delete block
- Graceful degradation; doesn't break page

### Circular Nesting
- Not restricted (allowed by schema); admin responsible
- Deep nesting can impact render performance; warn in editor if depth > 5 levels

### Version Conflicts
- CMS is single-writer (admin only); no concurrent edit conflicts
- Draft buffer prevents accidental overwrites
- Version history acts as audit trail

## Performance Considerations

### Block Render Optimization
- Blocks rendered server-side during Next.js build (static)
- Or render at request-time (dynamic pages)
- Each block component should memoize if props unchanged
- Nested blocks: depth limit recommended (e.g., max 5 levels)

### Image Handling
- Images in block props typically stored as URLs
- Support lazy-loading via `<Image>` component
- Consider CDN caching for featured images

### Version Storage
- `PageVersion` snapshots not pruned; can grow large over time
- Consider archival: keep last 100 versions, archive older
- `blocks` JSON can be large; index on `createdAt` for fast history queries

## Extensibility

### Adding Custom Block Types
1. Create React component accepting `{ props, children }`
2. Add definition to `BLOCK_REGISTRY`
3. Define schema for props validation and UI
4. Component automatically available in editor

### Custom Block Properties
- Schema system supports custom types (e.g., nested objects, arrays)
- Editor UI auto-generates fields based on schema
- Validation enforced server-side on save

### Block Styling
- Each block receives props for styling (e.g., `backgroundColor`, `alignment`)
- Render with Tailwind classes or inline styles
- Admin configurable via props panel

### Multi-Locale Blocks
- Same `blocks` JSON used across locales
- Block props can include localized strings:
  ```json
  { "type": "text", "props": { "markdown": { "bg": "Текст на BG", "en": "Text in EN" } } }
  ```
- Or fetch localized data at render time (component reads from DB)

## Key Files
- Block registry: [lib/blocks/registry.tsx](../lib/blocks/registry.tsx)
- Block editor: [components/admin/BlockEditor.tsx](../components/admin/BlockEditor.tsx)
- Admin page editor: `app/admin/pages/PageEditorShell.tsx`
- Public page renderer: `app/[locale]/[...slug]/page.tsx`
- Admin API: `app/api/admin/pages/route.ts`
- Prisma schema: [prisma/schema.prisma](../prisma/schema.prisma)
- Types: [lib/types.ts](../lib/types.ts)
