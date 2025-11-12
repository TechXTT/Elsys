# News System Overview

This document explains how the multi‑locale news system works across the database schema, public pages, admin APIs, admin UI, and supporting utilities.

## Purpose
- Replace filesystem Markdown/JSON news with PostgreSQL via Prisma.
- Support multi‑locale authoring, drafts vs published, images with metadata, and audit logs.
- Provide optional machine translation to seed content between locales.

## Data Model
- Entity: `NewsPost` (composite primary key `id + locale`).
- Fields: `title`, `excerpt`, `bodyMarkdown`, `date`, `images (Json)`, `featuredImage`, `published`, `authorId`, `createdAt`, `updatedAt`.
- Images: Array of `{ name, url, size }` where `size ∈ {small, medium, large, full}`; used by renderers to set max widths.
- Featured image: Resolves to `featuredImage` URL or falls back to first image.
- Prisma schema: see `prisma/schema.prisma` (model `NewsPost`).

## Public Read Flow
- Listing: `getNewsPosts(locale)` in `lib/news.ts` loads requested `locale`; if none exist (and `locale ≠ defaultLocale`), falls back to default locale posts. Only `published=true` items are shown.
- Detail: `getNewsPost(slug, locale)` tries requested locale first; if missing and `locale ≠ defaultLocale`, falls back to default locale. Drafts hidden.
- Routes:
  - Index: `app/[locale]/novini/page.tsx`
  - Detail: `app/[locale]/novini/[slug]/page.tsx`
- Rendering: Markdown through `react-markdown` with image size mapping; published date localized via `Intl.DateTimeFormat`.

## Admin API
- Auth: All routes gated by `getServerSession(authOptions)`; unauthorized returns `401`.
- Endpoints (Node runtime):
  - `GET /api/admin/news?locale=` — returns posts for locale (includes drafts).
  - `POST /api/admin/news` — creates a post from `FormData` (title, slug, excerpt, markdown, date, locale, published, images metadata + files, featuredImage).
  - `GET /api/admin/news/:id?locale=` — fetch a specific post (includes drafts).
  - `PUT /api/admin/news/:id` — updates post; supports slug change via create‑new then delete‑old to avoid composite PK mutation.
  - `DELETE /api/admin/news/:id?locale=` — deletes only that locale variant.
  - `POST /api/admin/news/translate` — DeepL‑based translation of fields.
- Image upload: Files stored in Vercel Blob under `news/{slug}/{filename}` via `@vercel/blob` `put()`.
- Validation highlights:
  - Slug/title/markdown required; featured image name must exist in metadata.
  - Duplicate slug check currently aligns with default locale during create.

## Admin UI
- Files: `app/admin/news/NewsAdminShell.tsx`, `app/admin/news/news-manager.tsx`.
- Locale switch: Client‑side, floating pill (bottom‑left) that does not interrupt editing. Loading/error messages appear underneath without moving the switch.
- Draft buffering: Per‑locale in‑memory cache `draftByLocale`; switching locale loads cached state or fresh defaults.
- Editing:
  - Loads locale variant of the same slug; if missing, user can start a draft.
  - Existing images marked `origin: existing` to avoid re‑upload.
- Creating:
  - Default status is draft (`published=false`).
  - Slug auto‑generated from title until manually touched.
  - Images can be referenced in Markdown by normalized filename (UI shows the exact token).
  - Per‑image display size selectable; featured image radio.
- Auto‑translate:
  - Disabled when published or busy; sends `title`, `excerpt`, `markdown` to translate endpoint.
  - Creates/loads draft for target locale and switches UI locale.

## Translation
- Endpoint: `app/api/admin/news/translate/route.ts`.
- Provider: DeepL Free (`https://api-free.deepl.com/v2/translate`) with `preserve_formatting=1`.
- Env var: `DEEPL_API_KEY` (or `DEEPL_AUTH_KEY`). If missing, translation is a no‑op (returns original text).
- Auditing: Records `newsPost.translate` or `.translate.error` with `{ source, target, provider: 'deepl' }`.

## Slug & Filename Normalization
- `slugify` allows Latin + Cyrillic, lowercases, condenses whitespace/various dashes to hyphen, strips invalid chars.
- Images: UI ensures unique names within a post by suffixing (`-1`, `-2`, …) when needed.

## Draft vs Published
- Public site shows only `published=true`.
- Admin list includes drafts always.
- Translation seeds drafts in the target locale.

## Fallback Behavior (Public)
- Listing fallback: If requested locale has zero posts and locale ≠ default, list default locale posts.
- Detail fallback: If requested locale variant missing, fall back to default locale variant of same slug.
- Drafts never leak publicly.

## Audit Logging
- File: `lib/audit.ts` (consumers in API routes).
- Common actions: `newsPost.list(.error)`, `.create.*`, `.open(.notfound)`, `.update.*`, `.delete`, `.translate(.error)`.
- Details include locale, counts, requested featured name, blob paths, provider, and errors.

## Error Handling
- 400 for validation (missing title/slug/markdown, invalid featured image, bad metadata/body).
- 409 for duplicate slug.
- 500 for upload/DB/translate errors.
- Admin UI surfaces inline status messages.

## Environment Variables
- `PRISMA_DATABASE_URL` — PostgreSQL connection string.
- `DEEPL_API_KEY` or `DEEPL_AUTH_KEY` — DeepL auth key.
- Vercel Blob config used implicitly by `@vercel/blob`.

## Performance Notes
- Admin list is unpaginated; introduce pagination if needed.
- Image uploads are sequential; could batch with care for rate limits.
- Markdown renders client‑side; acceptable for typical post sizes.

## Extensibility
- Tags/categories, scheduling (`publishAt`), soft delete (`deletedAt`), search indexing, role‑based authorization.
- Media cleanup for orphaned blobs after deletions or slug changes.

## Lifecycle Examples
1) Create Post
- Client prepares `FormData` with fields + `imageMeta` and files.
- Server validates, uploads images to Blob, assembles ordered image array, writes `NewsPost`, audits, responds with `PostItem`.

2) Edit + Locale Switch
- Editing `bg` slug; user switches to `en`.
- Shell caches current draft, fetches `en` variant; if not found, loads cached or blank draft.
- Save writes only the active locale row; other locales untouched.

## Key Files
- Data access: `lib/news.ts`
- Prisma schema: `prisma/schema.prisma`
- Public pages: `app/[locale]/novini/page.tsx`, `app/[locale]/novini/[slug]/page.tsx`
- Admin UI: `app/admin/news/NewsAdminShell.tsx`, `app/admin/news/news-manager.tsx`
- Admin API: `app/api/admin/news/*`
- Types: `lib/types.ts`
