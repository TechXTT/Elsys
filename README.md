# Elsys Website

Elsys is a multilingual (Bulgarian/English) school website built with the Next.js App Router. It combines a localized content strategy (JSON/Markdown) with a lightweight admin surface, Prisma-backed persistence, and modern frontend tooling.

**Core features**
- Multilingual site routing (`app/[locale]/...`) with server-side localized rendering
- CMS-style content stored in `content/{bg|en}` (JSON + Markdown)
- Admin UI for pages, navigation and news under `app/admin`
- Navigation tree caching with server-side hydration to improve first-load performance
- Auth via NextAuth for admin flows
- Prisma ORM for DB access and migrations
- Tailwind CSS + TypeScript for modern frontend DX

## Quick Setup

Prerequisites:
- Node 18+ (or compatible LTS)
- `pnpm` (recommended) — v7+ works, v9+ preferred

1. Install dependencies
```bash
pnpm install
```

2. Environment
- Copy the example environment file and update values:
```bash
cp .env.example .env
```
- Make sure to set `DATABASE_URL`, NextAuth secrets and any other required variables.

3. Database (Prisma)
```bash
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

4. Run the dev server
```bash
pnpm dev
```
Open http://localhost:3000

## Project Layout (high level)
- `app/` – Next.js App Router routes, localized layouts under `app/[locale]`
- `components/` – UI components and admin widgets
- `content/` – localized content files (`bg/`, `en/`)
- `lib/` – runtime helpers (Prisma client, content loader, navigation builder)
- `prisma/` – schema, migrations and seed scripts
- `scripts/` – content import / maintenance utilities

## Admin & API
- Admin UI: `app/admin` (requires authentication)
- API routes live under `app/api/*`, including admin endpoints that update content and invalidate navigation caches

## Common Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Start (production): `pnpm start`
- Prisma: `pnpm prisma generate`, `pnpm prisma migrate dev`, `pnpm prisma db seed`
- Lint: `pnpm lint`

## Deployment
This project is designed for Vercel (App Router) but can be deployed to any Node host. Ensure environment variables are set and the database is accessible from your deployment target.

## Troubleshooting & notes
- If you see missing Prisma types: `pnpm prisma generate`
- For local dev, use a local SQLite or Postgres DB and ensure `DATABASE_URL` is correct
- When changing navigation or admin data, APIs will invalidate server caches — if UI appears stale, restarting dev server or clearing build cache helps during development

## Contributing
- Fork and open a PR. Keep changes focused and add migration/seed updates when altering the schema.

## License
MIT