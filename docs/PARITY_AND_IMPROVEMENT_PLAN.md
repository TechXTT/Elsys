# Elsys Rewrite — Full Production Plan

Hand this file (or one phase at a time) to Claude Code. Each task lists target files, what to do, and how to verify. The plan is built around three constraints that are unique to ТУЕС:

1. **Admin turnover is generational.** The site is run by students who graduate. Tribal knowledge dies every two years. The system has to teach itself to the next admin.
2. **Some editors are teachers, not engineers.** A history teacher must be able to publish a news post without learning what a "block" is.
3. **It's a public-sector EU school site.** GDPR, WCAG 2.1 AA, retention rules, and predictable uptime are non-negotiable.

Every phase below is sized to ship independently. Phases 0–3 deliver functional parity with the live site. Phases 4–6 make it better than the live site. Phases 7–9 make it operable for the next ten years of student admins.

---

## 0. What "done" means

The rewrite replaces `elsys-bg.org` when **all** of these are true:

- Every content type the legacy site renders has a model, an admin UI, and a public view (see §4).
- A teacher with no training can publish a news post in under 5 minutes (see §5).
- A new student admin can onboard, find a runbook, and recover from a mistake without asking anyone (see §7).
- The site passes Lighthouse mobile ≥ 95 in Performance, ≥ 95 SEO, ≥ 100 Best Practices, ≥ 95 Accessibility on representative pages.
- The site survives a single-region outage with ≤ 5 minutes RTO and ≤ 1 hour RPO (see §8).
- Every legacy URL still resolves (§4 RouteRedirect) and Google indexes the new site without rank loss (see §9).

---

## 1. Target architecture

Keep the monolith. Don't fragment for fragmentation's sake.

```
┌──────────────────────────────────────────────────────────┐
│  Vercel — production (prod branch)                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Next.js 14 App Router                            │    │
│  │  • Public:  edge-cached, ISR, RSC                 │    │
│  │  • Admin:   serverful, separate bundle, JWT-gated │    │
│  │  • API:     server actions + thin REST            │    │
│  └──────────────────────────────────────────────────┘    │
│       │                │                │                  │
│       ▼                ▼                ▼                  │
│  Vercel Blob     Upstash Redis    Neon Postgres            │
│  (media)         (cache / RL)     (Prisma, PITR on)        │
└──────────────────────────────────────────────────────────┘

  Sentry — errors                 Resend — transactional email
  Better Stack — uptime           hCaptcha / Turnstile — bot guard
  Logflare/Axiom — logs           DeepL — translation
```

**Environments**

| Env | Branch | DB | Blob bucket | Domain |
|---|---|---|---|---|
| `production` | `main` | Neon prod (PITR) | `elsys-prod` | `elsys-bg.org` |
| `staging` | `staging` | Neon staging (daily reset from prod redacted) | `elsys-staging` | `staging.elsys-bg.org` |
| `preview` | PR branches | Neon branch (auto, 14d TTL) | `elsys-preview-<sha>` | `*.vercel.app` |
| `dev` | local | Local Postgres / Neon free | local fs or `elsys-dev` | `localhost:3000` |

All envs share the same code. Differentiate only by env vars. Document the full env-var matrix in `docs/runbooks/ENV_VARS.md`.

**Code layout** (extend, don't restructure)

```
app/
  [locale]/...            // public
  admin/...               // protected, separate layout
  api/admin/...           // admin REST (legacy; new code prefers Server Actions)
  api/public/...          // public APIs (RSS, search, ICS, sitemap-news)
components/
  admin/                  // builder, list, form primitives
  public/                 // marketing components
lib/
  cache.ts                // memory→Redis→DB helper (Phase 0)
  cms/                    // block compile/render
  blocks/                 // block registry
  content/                // per-type service modules (one file per model)
  search/                 // Postgres FTS adapter
  redirects/              // RouteRedirect logic
  audit.ts, auth.ts, redis.ts, prisma.ts, news.ts, navigation-*.ts
prisma/
  schema.prisma           // one source of truth
  migrations/             // forward-only, no destructive ops in prod
scripts/                  // import / scrape / maintenance
docs/
  runbooks/               // operational guides
  adr/                    // architecture decisions
  handover/               // generational handoff
```

**Non-functional choices**

- **Server Actions** for all new admin mutations. Keep existing REST routes alive but mark them deprecated; migrate over time. Easier to keep type-safe end-to-end.
- **Zod** schemas in `lib/content/*` are the single source of validation for both server and form UI.
- **Drizzle Studio or Prisma Studio** allowed in staging only — never prod.
- **No `force-dynamic`**. Everything either statically renders, uses ISR (`revalidate`), or is admin-only.
- **Edge runtime** for `/api/public/search`, `/api/public/route-alias`, `/sitemap.xml`, `/robots.txt`. Node runtime for anything touching Prisma.

---

## 2. Tech choices — locked

Pin these so Claude Code doesn't re-debate them.

| Concern | Pick | Why |
|---|---|---|
| Framework | Next.js 14 App Router | Already chosen, App Router stable, supports ISR + Server Actions + RSC |
| DB | Postgres on Neon | Branching for previews, PITR, no infra to babysit |
| ORM | Prisma 6 | Already used; migration tooling is the bottleneck Claude Code should not change |
| Cache | Upstash Redis | Serverless-friendly, fits the existing `lib/redis.ts` |
| Blob | Vercel Blob | Already integrated |
| Auth | NextAuth v4 (credentials) | Already wired; add OAuth providers later (§7.5) |
| Email | Resend | Simple API, generous free tier, works from Vercel functions |
| Image opt | `next/image` w/ Vercel loader | Auto WebP/AVIF + `srcset` |
| Search | Postgres FTS first → Meilisearch if scale demands | Avoids a service until needed |
| Bot mitigation | Cloudflare Turnstile | Free, no PII, no cookie banner cost |
| Errors | Sentry | Source-map upload via Vercel integration |
| Logs | Axiom (Vercel native) | Cheaper than Datadog; SQL-ish queries |
| Uptime | Better Stack | Status page + paging, free for a single monitor |
| Translation | DeepL API | Already used in `app/api/admin/news/translate`; extend coverage |
| WYSIWYG | TipTap | Headless ProseMirror; embeds cleanly into the existing block builder |
| Forms | React Hook Form + Zod | Pair already common with Next.js |
| Validation | Zod | One schema, server + client |
| Cookies / consent | First-party banner, no third-party CMP | Site does not run ads; only essentials + analytics with consent |
| Analytics | Vercel Web Analytics | Cookieless, GDPR-friendly |
| CI | GitHub Actions | Already implied by `.github/` |
| Linting | ESLint + `eslint-plugin-import` (size guard) + Prettier | Bundle-budget check on PRs |

---

## 3. Working agreements for Claude Code

Put these in `CLAUDE.md` at the repo root.

- **One change per branch.** No mixing of "new content type + refactor + dependency bump".
- **Schema changes always come with a migration and a seed update.** Never leave Prisma out of sync.
- **Every admin route writes to `AuditLog`.** Reuse `lib/audit.ts`.
- **Every admin mutation calls `revalidatePath` for both locales and bumps the cache version.** No exceptions.
- **All public reads use explicit Prisma `select`.** No `findMany()` without projection.
- **All public reads go through `lib/cache.ts`.** Memory → Redis → DB, in that order.
- **All user-facing strings live in `messages/{bg,en}.json`.** Never hardcode Cyrillic in JSX.
- **All admin-facing strings also live in `messages/{bg,en}.json`** under an `Admin.*` namespace. Yes, including button labels.
- **Tests:** Vitest for unit, Playwright for one happy-path e2e per phase. No "100% coverage" demands — gate the critical paths only.
- **PR template** in `.github/PULL_REQUEST_TEMPLATE.md` forces: what, why, screenshots if UI, migration notes, rollback plan.
- **Stop and ask** if a task requires touching auth, billing, deletion of production data, or schema rename. Do not "make it work" alone.

---

## 4. Content build-out (the big block of work)

The legacy site has ~20 first-class content types. The rewrite has Pages and News. Every other content type below needs: Prisma model, admin scaffold entry, public route(s), block(s) for the PageBuilder, Zod schema, seed entries, and a Playwright happy-path test.

### 4.1 Shared shape

Every content type extends a common base. Put this in `lib/content/shared.ts`:

```ts
type ContentBase = {
  id: string
  locale: Locale
  groupId: string?      // links locale variants
  slug: string
  status: PublishStatus // DRAFT | PREVIEW | PUBLISHED | SCHEDULED | ARCHIVED
  order: int
  publishAt: DateTime?
  unpublishAt: DateTime?
  authorId: string?
  legacyId: int?        // for cross-reference w/ legacy DB during migration
  createdAt, updatedAt: DateTime
}
```

Add `enum PublishStatus { DRAFT PREVIEW PUBLISHED SCHEDULED ARCHIVED }` to `prisma/schema.prisma`. Treat the existing `Page.published` and `NewsPost.published` booleans as legacy — migrate to `status`, keep a computed `isPublic = status='PUBLISHED' AND (publishAt IS NULL OR publishAt <= now)` view used by all public queries.

### 4.2 The generic admin scaffold

Build this once, every content type plugs into it:

- `app/admin/content/[type]/page.tsx` — list (search, filter, sort, bulk actions, pagination)
- `app/admin/content/[type]/new/page.tsx` — new record
- `app/admin/content/[type]/[id]/page.tsx` — edit record
- `app/admin/content/registry.ts` — `{ slug → { model, label, fields, columns, hooks, permissions } }`

The registry holds Zod schemas. The form renderer reads the Zod schema and renders fields automatically (text → input, enum → select, image → media-library picker, array → list, etc.). This is how a new content type becomes ~30 lines of config, not a new route tree.

Re-use existing primitives in `app/admin/components/`: `DataTable`, `PageHeader`, `EmptyState`, `StatCard`, `Badge`, `Button`, `Card`, `QuickAction`.

### 4.3 Per-content-type tasks

For each type below: ① add Prisma model + migration, ② add registry entry, ③ add public route(s), ④ register PageBuilder blocks, ⑤ seed, ⑥ Playwright happy-path. One PR per type.

| # | Type | Fields (beyond `ContentBase`) | Public routes | Blocks for PageBuilder |
|---|---|---|---|---|
| 1 | `Carousel` | `title`, `subtitle`, `imageDesktop`, `imageTablet`, `imagePhone`, `linkUrl`, `linkLabel` | rendered as a block only | `CarouselHero` (picks all published slides, ordered) |
| 2 | `Club` | `title`, `description`, `body` (TipTap JSON), `color: ColorTag`, `coverImage`, `gallery: MediaAsset[]`, `meetingSchedule`, `contactEmail` | `/[locale]/uchenicheski-jivot/klubove/[slug]` | `ClubGrid`, `ClubSpotlight` |
| 3 | `Gallery` | `adminTitle`, `title`, `description`, `coverImage`, `color: ColorTag`, `images: GalleryImage[]` | `/[locale]/uchilishteto/galerija/[slug]` | `GalleryGrid`, `GalleryStrip`, `GalleryLightbox` |
| 4 | `Document` | `title`, `description`, `fileUrl`, `fileSize`, `mimeType`, `category` | listed under containing Page | `DocumentList`, `DocumentDownloadCard` |
| 5 | `Event` (+ `EventCategory`) | `title`, `description`, `body`, `startsAt`, `endsAt`, `allDay`, `location`, `categoryId`, `coverImage` | `/[locale]/kalendar`, `/[locale]/kalendar/[slug]`, `/[locale]/kalendar/ics` | `EventList`, `EventCalendar`, `UpcomingEvents` |
| 6 | `TeamMember` (+ `TeamCategory`) | `firstName`, `lastName`, `role`, `subjects`, `photoUrl`, `bio`, `email`, `linkedinUrl`, `categoryId` | `/[locale]/uchilishteto/prepodavatelski-ekip` | `TeamGrid`, `TeamMemberCard` |
| 7 | `Partner` (+ `PartnerCategory`) | `name`, `logoUrl`, `websiteUrl`, `description`, `tier`, `categoryId` | rendered as block only | `PartnerStrip`, `PartnerGrid` |
| 8 | `Leader` (alumni) | `name`, `gradYear`, `currentRole`, `currentCompany`, `photoUrl`, `bio`, `linkedinUrl` | `/[locale]/uchilishteto/lideri-zavyrshili-tues` | `LeaderGrid`, `LeaderSpotlight` |
| 9 | `Award` | `title`, `year`, `competitionName`, `place`, `studentNames: string[]`, `description`, `linkUrl`, `coverImage` | `/[locale]/uchenicheski-jivot/nagradi` | `AwardList`, `RecentAwards` |
| 10 | `Internship` + `InternshipApplication` | (offer) `title`, `description`, `body`, `companyName`, `closesAt`; (app) `name`, `email`, `cvUrl`, `message`, `gdprConsent`, `status` | `/[locale]/stajove` | `InternshipList` |
| 11 | `Course` (prep) | `subject`, `grade`, `description`, `schedule`, `feeLeva`, `enrollmentUrl`, `coverImage` | `/[locale]/priem/podgotvitelni-kursove` | `CourseList` |
| 12 | `Project` (Erasmus etc.) | `title`, `programCode`, `description`, `body`, `partners`, `startDate`, `endDate`, `budgetEur`, `coverImage`, `documents: Document[]` | `/[locale]/uchilishteto/evropejski-proekti/[slug]` | `ProjectList`, `ProjectSpotlight` |
| 13 | `Testimonial` | `quote`, `authorName`, `authorRole`, `authorPhotoUrl`, `videoUrl?` | rendered as block | `TestimonialCarousel`, `TestimonialQuote` |
| 14 | `NumberStat` | `value`, `label`, `icon`, `order` | rendered as block | `NumberStats` |
| 15 | `HeaderAccent` | `title`, `body`, `linkUrl`, `linkLabel`, `expiresAt`, `priority` | rendered as block above header | `HeaderAccent` |
| 16 | `NewsPost` (extend) | add `categoryId` (Event/Excursion/Inspiration/Blog/Media/Erasmus), `tags`, `relatedPostIds` | already exists | `LatestNews`, `NewsByCategory` (new) |
| 17 | `RouteRedirect` | `fromPath`, `toPath`, `locale?`, `status` | middleware-only | n/a |
| 18 | `ContactSubmission` | `name`, `email`, `subject`, `message`, `ip`, `userAgent`, `status` | `/[locale]/kontakti` form posts to `/api/public/contact` | n/a |
| 19 | `BlockPreset` | `name`, `blockType`, `props`, `previewImage?` | n/a | shown in `BlockPalette` |
| 20 | `Page` (extend) | add `metaTitle`, `metaDescription`, `metaKeywords`, `ogImage`, `noindex`, `canonicalUrl`, `cssClass`, `template` | already exists | n/a |

### 4.4 Page-builder blocks register the data

Today, `lib/blocks/registry.tsx` has Hero/Section/Markdown. Extend it:

```ts
type BlockContext = {
  locale: Locale
  resolveContent: <T>(type: ContentType, args?: QueryArgs) => Promise<T[]>
}
```

Every list/grid block declares its data dependency. The page resolver pre-fetches all dependencies in parallel (single Promise.all) before rendering. That avoids waterfall queries inside RSC.

---

## 5. Editor experience — teacher-friendly first

This is the part that makes or breaks adoption. The legacy CMS lost teachers years ago; they ask students to publish. We fix that.

### 5.1 Two modes for the same builder

Add a mode toggle at the top of every edit page:

- **Simple mode (default).** Shows: title, summary, cover image, body (TipTap WYSIWYG), publish status, schedule. That's it. Body fields use TipTap with a curated toolbar (B / I / heading / list / link / image / quote). No "blocks", no JSON.
- **Advanced mode.** Reveals the block builder, raw markdown, and the JSON editor.

Persist the user's choice per role: by default, `TEACHER` role lands in Simple; `EDITOR` and `ADMIN` land where they left off.

### 5.2 Page templates (not just block primitives)

A teacher should pick "Event announcement" and fill 4 fields. Implement `app/admin/templates/`:

| Template | What it does |
|---|---|
| News post with cover | Title, excerpt, cover image, body |
| News post with gallery | Same + image carousel |
| Event announcement | Title, date/time, location, body, cover |
| Teacher bio | Name, role, photo, bio, contact |
| Project / Erasmus page | Title, period, partners, description, documents |
| Award announcement | Title, competition, students, photo, link |
| Club page | Title, color, cover, body, schedule, contact |

A template is a JSON document the registry loads when "New from template" is clicked. The user sees a form, not a builder. Behind the scenes the page is still composed of blocks, so an admin in Advanced mode can keep customizing.

### 5.3 Inline editing on the public site

For logged-in admins, every editable region on the public site gets a hover edit pencil that opens the inline editor in a drawer (uses the same TipTap instance). Saves go through the same Server Action and revalidate. This is the single biggest QoL win — the teacher edits what they see, not what the schema looks like.

Pattern: wrap content in `<Editable type="page" id={page.id} field="body">`. Component is a no-op for anonymous users and a click-to-edit drawer for admins.

### 5.4 Smart defaults and auto-fill

- Slug auto-derives from title via Cyrillic-aware transliteration (use `transliteration` npm package), but show the slug field so it can be overridden.
- Cover image auto-picks the first uploaded image if none is set.
- Excerpt auto-derives from the first ~160 chars of body when blank.
- `date` defaults to `now()` for News.
- "Last 5 images you used" appears in the image picker.

### 5.5 Auto-save + crash recovery

Every form auto-saves to `localStorage` every 5 seconds. On reload, prompt: "We found a draft you didn't publish — restore it?" Drafts also flush to the server every 30 seconds as a `PageVersion` / `NewsPostVersion` with `status='DRAFT'`. This means closing the laptop on the bus never loses work.

### 5.6 Visual diff for restores

When a user opens version history, render the diff (use `diff-match-patch` on Markdown / TipTap JSON output) — additions in green, deletions in red. Click any version to restore. The current version history UI in `app/admin/news/components` already opens a modal; extend it.

### 5.7 Bulgarian-first UI

Set the admin default locale to `bg`. Every label, every button, every empty-state message lives in `messages/bg.json` under `Admin.*`. English admin UI is opt-in. Keep labels short and plain (avoid jargon: "Скрий", not "Деактивирай").

### 5.8 Validation with friendly messages

Zod's default messages are programmer-y. Wrap with `lib/content/validation.ts` that maps Zod issues to Bulgarian sentences like "Заглавието трябва да е поне 5 символа". Show them under the field, not in a banner.

### 5.9 Inline image cropper

When a user uploads an image to a slot that needs a specific aspect ratio (carousel desktop 1366×564, news card 16:9), open `react-easy-crop` modal. Server crops with `sharp` and saves all variants in one shot. The teacher never thinks about pixels.

### 5.10 "Schedule publish" with a real calendar widget

Replace the existing date input on News + every type that has `publishAt` with a date+time picker (use `react-day-picker`). Show a chip: "Will publish on 12.06.2026 г. в 14:00" with an "Unschedule" button.

### 5.11 Bulk operations

In list views, allow multi-select and: publish, unpublish, archive, delete, change category, change owner. Confirmation dialog summarizes the action: "Ще публикувате 7 новини. Продължи?"

### 5.12 Spell check + style hints

Embed LanguageTool's open API for BG/EN spell + grammar check on every text field (Excerpt, Body). Show squiggles. Optional per user; off by default to keep latency low on slow devices.

### 5.13 Mobile editing

Admin must work on a phone. The PageBuilder is desktop-only by design (and shows a "Open on a larger screen" page on mobile), but the **News + Event forms** must work on iPhone SE. That's the realistic editing surface for a teacher at school.

### 5.14 Activity feed inside admin

Already partially in the Dashboard. Add a real-time-ish feed (poll every 30s) on every list page showing "Иван редактира 'История' преди 2 минути". Reduces "did someone else change this?" anxiety.

### 5.15 Comments on records

Every record gets a `Comment` model. Editors discuss changes, leave notes for the next student admin: "Тази страница се обновява всеки септември — нова учебна година". Comments are private (admin-only), markdown-supported, with `@mention` notifications via Resend.

### 5.16 "Why is this field here?" help

Every form field has a tooltip pulled from `messages/bg.json` under `Admin.Help.*`. Click the question mark, see two sentences and a link to the runbook in `docs/runbooks`. New student admins discover the system by hovering, not by asking the previous batch.

---

## 6. Generational handoff — the unique constraint

This is what no off-the-shelf CMS solves. Design for it explicitly.

### 6.1 Roles and permissions

Add to the `Role` enum: `STUDENT_ADMIN`, `STUDENT_EDITOR`, `TEACHER`, `ADMIN`. Map permissions:

| Role | News | Pages | Events | Galleries | Other content | Users | Settings | Redirects |
|---|---|---|---|---|---|---|---|---|
| `TEACHER` | edit own draft, publish own | view | edit own | edit own | view | none | none | none |
| `STUDENT_EDITOR` | edit, publish | view | edit, publish | edit, publish | edit, publish | none | none | none |
| `STUDENT_ADMIN` | full | full | full | full | full | invite student roles | view | edit |
| `ADMIN` | full | full | full | full | full | full | full | full |

Enforce in `lib/auth.ts` middleware + Server Action guards. Store the matrix in `lib/auth/permissions.ts` so a new role takes a few lines.

### 6.2 Onboarding wizard

First login for any non-`ADMIN` user runs `/admin/welcome`:

1. Choose preferred language (BG / EN).
2. Set display name.
3. 30-second tour of the dashboard (Shepherd.js).
4. "Try publishing a test news post" — opens the form pre-filled with a draft, points at each field.
5. Checklist: "I have read the Editorial Style Guide", "I know how to recover a deleted post", "I know who to ask".

Track completion in `User.onboardedAt`. Show a banner until done.

### 6.3 Built-in runbooks

`/admin/help` lists every runbook in `docs/runbooks/` (parsed from markdown on the server). Indexed by Postgres FTS. Examples to ship:

- `add-news.md` — how to publish a news post
- `update-homepage.md` — how to swap homepage hero
- `change-academic-year.md` — what to update each September
- `gallery-upload.md` — best practices for image uploads
- `restore-deleted.md` — how to recover from a mistake
- `season-handover.md` — what the outgoing admin owes the incoming admin

### 6.4 Handover notes

On every record, a tab "Бележки за следващите" (notes for successors). Markdown. Show on edit: "Иван е оставил бележка за тази страница". Crucial for content like "Прием" that changes every year with rules nobody documented.

### 6.5 Sandbox mode

A button on the admin dashboard: "Open practice mode". This duplicates the user to a separate `dev_user_<id>` session, points the client at a sandbox DB (clone of prod nightly, redacted PII), and a sandbox Blob bucket. The new admin can break things without breaking prod. Implementation: a separate Vercel deployment under `sandbox.elsys-bg.org` with same code, separate env vars.

### 6.6 Audit log with humans

Existing `AuditLog` is good. Surface it:

- Every record shows "Last edited by …" prominently.
- A user's profile page shows their last 50 actions.
- Email digest to admins each Monday: "Last week: 12 news posts, 3 page edits, 0 deletions."
- Anomaly alert: "Иван deleted 14 items in 10 minutes" → Slack webhook to a coordinators channel.

### 6.7 Annual review reminders

Cron (Vercel Scheduled Functions) every September 1:

- Tag pages with `lastReviewedAt < 1 year ago` as `NEEDS_REVIEW`.
- Email a summary to admins with the list.
- Show a banner in admin: "5 страници не са преглеждани повече от година".

### 6.8 Succession ceremony

A first-class flow at `/admin/handover`:

- Outgoing admin lists incoming admin emails.
- System issues invitation links (NextAuth invitation tokens), pre-assigns the right role.
- Outgoing admin can write a handover doc (filled in by the system from their last-6-months audit log: "You edited these 8 pages most often").
- Outgoing admin is auto-archived (read-only) after a configurable date.

### 6.9 Knowledge base inside admin

`/admin/help` is the entry. `/admin/help/glossary` defines every term ("Какво е block?", "Какво е slug?", "Какво е revalidate?"). Updates to the glossary are PRs to `docs/glossary/*.md` — version controlled like everything else.

---

## 7. Public site polish

### 7.1 Accessibility (WCAG 2.1 AA — required for EU public sector)

- Every interactive element has visible focus.
- Color contrast ≥ 4.5:1 for text. Audit Tailwind theme.
- Skip-to-content link at top of every page.
- Form labels associated, errors announced via `aria-live`.
- Carousel: pausable, no auto-advance under 5s, keyboard arrows.
- Images: `alt` required on upload; admin enforces non-empty alt for `decorative=false`.
- Run `axe-core` in CI on representative pages.

### 7.2 SEO

- `metaTitle` / `metaDescription` per page (see 4.3 #20).
- `sitemap.xml` enumerates all published Pages, News, Galleries, Events.
- `sitemap-news.xml` with `<news:news>` for last 48h news (Google News).
- `robots.txt` static.
- Open Graph + Twitter cards on every page; auto-generated OG via `@vercel/og` route `/og/[type]/[id]`.
- Hreflang on every localized page (`<link rel="alternate" hreflang="bg" …>`, `…="en" …`, `…="x-default" …`).
- Schema.org JSON-LD: `Organization`, `EducationalOrganization`, `NewsArticle`, `Event`.
- Canonical URLs always include trailing slash policy (pick one and stick).
- 404 page links to search, sitemap, and top sections.
- 301 from all legacy URLs (see RouteRedirect §4 #17 — populated from legacy "Old URL" + scraped list).

### 7.3 Performance

- LCP < 2.0s mobile 4G.
- All public reads through `lib/cache.ts` (memory → Redis → DB).
- `next/image` everywhere, with explicit `sizes`.
- Self-host fonts as `.woff2` only with `font-display: swap`; subset to Cyrillic + Latin.
- Drop the legacy `dot-bgr.png`/sprite assets; reproduce in CSS or SVG inline.
- Critical CSS inlined; defer everything else.
- Prefetch links on hover for primary nav.
- ISR `revalidate=300` on static-ish pages; `revalidate=60` on `/news`; on-demand revalidation on save.
- Bundle budget per public route: ≤ 100KB gzipped client JS. Enforce in CI.

### 7.4 Internationalization

- BG default. EN secondary.
- Locale fallback chain: requested → default. Already in `lib/content.ts`.
- Translation status visible in admin: every record shows "EN: missing / stale / current" based on `updatedAt` comparison with the BG counterpart.
- "Auto-translate to EN" button on every record (extend the existing DeepL integration from News).
- Glossary of fixed terms (school name, club names) protected from translation via DeepL's `<x>` tags.

### 7.5 OAuth for student accounts

Add Google OAuth provider in `lib/auth.ts`, restricted to `@elsys-bg.org` (or the school's mail domain). Existing credentials provider stays for legacy accounts. New student admins sign in with their school account; reduces password reset pain over generations.

---

## 8. Operability

### 8.1 Backups

- DB: Neon PITR 7 days minimum.
- Blob: weekly mirror to `s3://elsys-backup` via scheduled function (rclone or `@aws-sdk/client-s3`). 90 days retention.
- Application config: Vercel env vars exported monthly to a 1Password vault — manual but documented in the runbook.
- Quarterly restore drill — restore staging from prod backup end-to-end, time it, document in `docs/runbooks/RESTORE_DRILL.md`.

### 8.2 Monitoring + alerting

- Sentry: errors, source-mapped. Alert on any error rate ≥ 1% per 5 minutes.
- Better Stack: uptime checks every minute on `/`, `/api/health`, `/admin/login`. Alert on 2 consecutive failures.
- Vercel Web Analytics: Core Web Vitals trend.
- Custom dashboard at `/admin/health` (admins only): DB latency p50/p95, Redis hit rate, blob storage usage, Resend bounce rate.

### 8.3 Health endpoint

`GET /api/health` returns `{ db: ok|err, redis: ok|err, blob: ok|err }` in < 500ms. Plug Better Stack into this.

### 8.4 Rate limits

Upstash `@upstash/ratelimit` on every public POST: contact form, internship application, search, login. Per-IP and per-route. Already use Redis.

### 8.5 Security

- CSP via `next.config.mjs` headers — `default-src 'self'`, allow Vercel Blob + Vercel Analytics + Cloudflare Turnstile.
- HSTS: 1 year, preload.
- `X-Frame-Options: DENY` on admin, `SAMEORIGIN` on public.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- CSRF: Server Actions are CSRF-safe by default; REST routes that mutate require `X-CSRF` header (Next 14 supports this).
- Login throttle: 5 attempts per 15min per IP; lockout with one-time secret recovery (already in code).
- 2FA TOTP for `ADMIN` role (recommended, optional for students). Use `otpauth`.
- Quarterly dependency audit (`pnpm audit --prod`), block in CI on critical CVEs.

### 8.6 GDPR

- Cookie banner: essentials only by default. Analytics requires consent.
- Privacy policy page (BG + EN) at `/[locale]/privacy`.
- Data subject access: `/admin/users/[id]/export` produces a JSON dump of that user's data; `/admin/users/[id]/delete` purges (cascades via Prisma onDelete). Document both flows.
- Retention: `ContactSubmission` auto-anonymizes IP after 30 days; deletes the row after 2 years.
- Children's data: school is K-12; minors' photos require parental consent recorded against the `MediaAsset` (`consentRecordedAt`).
- DPA with Vercel, Neon, Upstash, Resend on file under `docs/legal/`.

### 8.7 Runbooks (in `docs/runbooks/`)

- `INCIDENT_RESPONSE.md` — what to do when something's on fire (already half exists; the engineering plugin has a skill for this)
- `DEPLOY.md` — how Vercel deploys, how to roll back
- `RESTORE_DRILL.md` — restore from backup
- `ROTATE_SECRETS.md` — env var rotation
- `ENV_VARS.md` — every env var, where it's set, who has access
- `ON_CALL.md` — who responds when (probably the lead student admin + a teacher contact)
- `LEGACY_REDIRECTS.md` — how to add a redirect
- `SCALE.md` — when to switch from FTS to Meilisearch, when to upgrade Neon tier

### 8.8 CI/CD

- PR → preview deploy (Vercel) on a Neon branch DB. Auto-seed.
- PR checks: lint, typecheck, vitest, playwright (smoke only), bundle budget, accessibility (axe on a fixed page set), `pnpm audit` (warn on high, fail on critical), Prisma migrate dry-run.
- Merge to `main` → deploy to production.
- Migrations applied automatically only if `prisma migrate diff` is non-destructive; destructive migrations require manual approval (a `MIGRATION_APPROVED=true` env var in the GitHub Action).

### 8.9 Logging

- Structured logs (JSON) via `pino` from server actions and API routes.
- Axiom collects from Vercel; queries documented in `docs/runbooks/QUERIES.md`.

---

## 9. Migration from legacy

Two tracks; run both in parallel.

### 9.1 Data import

- Ask StudioX for a Sweboo DB dump (preferred) or scrape (fallback).
- Per-type importer in `scripts/import/`: `import-news.ts`, `import-galleries.ts`, etc. Each one is idempotent and stores `legacyId`.
- Re-upload images to Vercel Blob, rewrite Markdown image refs.
- Pull WYSIWYG HTML through `turndown` (already a dep) into Markdown for the body, then run through TipTap's HTML import to populate `blocks`.
- Generate `RouteRedirect` entries from the legacy "Old URL" field and the legacy slug pattern.

### 9.2 Visual parity check

- Build `scripts/visual-diff.ts` using Playwright + `pixelmatch`. For a list of URLs, screenshot legacy and new, diff. Fail if pixel diff > 1% for any non-dynamic region. Tolerates dates and dynamic news lists.

### 9.3 Cutover plan

1. Two weeks before cutover: deploy production behind a Vercel preview domain. Internal team uses for review.
2. One week before: dry-run import, run visual diff against a frozen legacy snapshot.
3. Cutover day: take legacy admin offline (no writes), run final import, run visual diff, point DNS to Vercel (TTL drop 24h prior).
4. Watch for 48h. Keep legacy reachable at `legacy.elsys-bg.org` for one quarter for emergencies.

### 9.4 Rollback

DNS-level. Reverting the apex record to legacy gets you back inside 5 minutes if TTL was dropped beforehand. Document in `docs/runbooks/CUTOVER.md`.

---

## 10. Phased roadmap (10 weeks, calendar)

Each phase ends in a shippable state. Mid-phase, the site stays running on the previous one.

| Week | Phase | What lands |
|---|---|---|
| 1 | 0. Foundations | Cache helper, `next/image`, on-demand revalidation everywhere, Sentry, Axiom, CI gates, env matrix |
| 2 | 1. Generic content scaffold | `app/admin/content/[type]`, registry, Zod-driven forms, media library v1 |
| 3–4 | 2. Content types — wave A | Carousel, Club, Gallery, Document, Event, Testimonial, NumberStat, HeaderAccent |
| 5 | 3. Content types — wave B | TeamMember, Partner, Leader, Award, Course, Project |
| 6 | 4. Editor UX | Templates, Simple/Advanced toggle, inline editing, auto-save, version diff, image cropper, schedule picker, bulk ops |
| 7 | 5. Public polish | SEO panel + JSON-LD, sitemap-news, RSS, OG images, ICS, search (FTS), contact form |
| 8 | 6. Generational handoff | Roles + permissions, onboarding wizard, runbooks page, comments + handover notes, sandbox env, annual review cron |
| 9 | 7. Migration | Importers, visual-diff, redirects backfill, cutover dress rehearsal |
| 10 | 8. Cutover + watch | DNS swap, 48h watch, post-launch backlog |

Beyond week 10: optional improvements queue (OAuth, 2FA, Meilisearch, PWA, etc.).

---

## 11. Out of scope (for now)

Document these so Claude Code doesn't burn time on them:

- A custom mobile app. The public site is mobile-first; admin works on phones for News + Events only.
- A discussion forum or comment system for the public side. Not in scope.
- E-commerce / paid courses. Not in scope.
- Real-time collaboration on the same record (Google-Docs style). Locking + "Иван редактира тази страница" warning is enough.
- Custom branded analytics. Vercel Web Analytics + an export to CSV are enough.
- An iOS/Android SDK or public API for third parties. RSS + sitemap-news cover the realistic external consumers.

---

## 12. How to brief Claude Code

Use this as the first message per phase. Replace `<PHASE>` and `<NUMBERED TASK>`:

> Read `docs/PARITY_AND_IMPROVEMENT_PLAN.md`. Work only on Phase `<PHASE>`, task `<NUMBERED TASK>`. Before writing code:
>
> 1. Open the files mentioned and confirm the current state matches what the plan describes.
> 2. Tell me what you're about to change, in 5 bullets, with file paths.
> 3. Wait for my "go" before editing.
>
> After "go":
>
> 1. One branch, one task. No bundled refactors.
> 2. Migration if schema changed; seed update if seed touches the affected model.
> 3. Update `messages/bg.json` and `messages/en.json` for any user-visible string.
> 4. Add or update one Playwright happy-path test for the new behavior.
> 5. Verify on the dev server (`pnpm dev`) before reporting done.
> 6. Open a PR with the template checklist filled in.

Do this one task at a time. Two weeks of disciplined small PRs beat two weeks of one giant "Phase 3" PR you can't review.

---

## 13. First task to hand off

> Phase 0, Task 0.2: Promote the in-memory 60s list cache in `lib/news.ts` into a reusable helper at `lib/cache.ts` that supports memory → Redis → DB with versioned invalidation. Pattern lives in `lib/navigation-cache.ts` and `lib/redis.ts`. Refactor `lib/news.ts` to use the new helper. Don't touch any other call sites yet — those come in later tasks. Verify by running `pnpm dev`, hitting `/bg/novini-i-sybitija/novini`, and checking the Vercel function logs show a Redis hit on the second request.

That single task unblocks every other phase.
