# Legacy site map — elsys-bg.org (Sweboo) → new CMS

Audit for the G4 migration (PLAN M4.1/4.2). Source: `https://elsys-bg.org`
(legacy Sweboo by StudioX). Captured from a read-only homepage + section crawl.

- **robots.txt:** `User-agent: * / Disallow: /admin/` — only `/admin/` is off-limits. The crawler honors this.
- **sitemap.xml:** absent (404) → enumerate via nav + section listing crawl.
- **ID convention:** content items end in `-<numericId>` (e.g. `…-921`). That numeric id is the stable `legacyId`; everything before it is the legacy slug.

## URL patterns → target type + route

| Legacy pattern | Example | New type | New route | Notes |
|---|---|---|---|---|
| `/novini-i-sybitija/novini` | list | NewsPost (list) | `/novini` | news index |
| `/novini-i-sybitija/novini/<slug>-<id>` | `…/tyrjestveno-izprashtane-…-920` | **NewsPost** | `/novini/<slug>` | body, gallery, featured, date |
| `/blog` + `/blog/<slug>-<id>` | `/blog/triumf-…-703` | **NewsPost** (category=Блог) | `/novini/<slug>` | legacy "blog" folds into news w/ a Блог category Page |
| `/obuchenie/<page>` | `/obuchenie/uchebna-programa` | **Page** | `/obuchenie/<slug>` | 2-level page tree (Text/HTML) |
| `/priem/<page>` | `/priem/zashto-da-izbera-tues` | **Page** | `/priem/<slug>` | admissions pages |
| `/uchenicheski-jivot/<page>` | `/uchenicheski-jivot/ekskurzii` | **Page** | `/uchenicheski-jivot/<slug>` | student-life pages |
| `/uchenicheski-jivot/<section>/<slug>-<id>` | `/…/inspiration-talks/…-498` | **NewsPost** or **Page** | per section | item lists under a section page |
| `/tues-talks`, `/tues-talks`-likes | top-level | **Page** | `/<slug>` | standalone pages |

### Content types per PLAN §2 (legacy admin had these; map each)
- **News** (`/novini-i-sybitija/novini/*`) + **Blog** (`/blog/*`) → NewsPost (blog → category Page "Блог").
- **Page / Text-HTML** (`/obuchenie`, `/priem`, `/uchenicheski-jivot`, standalone) → Page (2-level tree; parentId from the first path segment).
- **Document** — legacy "правилници и документи" pages list downloadable files → Document (extract `<a href=*.pdf|doc|…>`).
- **Club** — student-life clubs → Club.
- **Team(+category)** — преподавателски екип → TeamMember (category = group heading).
- **Partner(+category)** — партньори (incl. Erasmus) → Partner.
- **Gallery** — галерии → GalleryItem (album = gallery title).
- **Project** — евро/проекти → Project.
- **Award** — отличия by year → Award (year from heading).
- **Leader** — изявени възпитаници/alumni by year → Leader.

### Dropped types (PLAN §2 / D-10) → redirect targets
- **Calendar** (`/obuchenie/kalendar-na-sybitijata`) → `/novini` (news/events).
- **Internships / Prep courses** (dead 5–9y; GDPR-risky) → `/priem` or `/obuchenie`.
  Their legacy URLs get `RouteRedirect` rows to these sensible targets (R1).

## Extraction notes (Sweboo TinyMCE)
- Main content lives in the primary content container (heuristic: largest `<article>`/`.content`/`#content` region; the existing `scripts/import-from-elsys-bg.mjs` already does heuristic main-content extraction — reused/improved).
- News items carry: title (`<h1>`), date, body (TinyMCE HTML), inline images + a gallery, featured image.
- Images are absolute or root-relative under the origin; the media pipeline downloads, dedupes by hash, re-uploads to Blob, and **flags missing alt + minors'-photo consent** (never auto-asserts consent).

## Idempotency
- Every imported record keeps `legacyId` (the trailing numeric id) + `legacyUrl`.
- Importers upsert by `legacyId` so re-runs converge. Imported content lands **DRAFT** (never auto-published); EN goes through the existing DeepL needs-review path.
