# Elsys Website

A multilingual (bg/en) school website built with Next.js 15 App Router, TypeScript, Tailwind CSS, and Prisma. Content is stored as local JSON/Markdown and rendered through localized routes.

## Stack
- Next.js (App Router) + React
- TypeScript
- Tailwind CSS
- NextAuth.js (Auth)
- Prisma + SQLite (dev) / adapt for your DB
- pnpm workspace

## Project structure
- `app/` – App Router pages. Localized under `app/[locale]/...`
- `components/` – UI components
- `content/` – Localized content in `bg/` and `en/` (JSON + Markdown)
- `i18n/` – i18n routing/config
- `lib/` – helpers (content loader, auth, Prisma client, etc.)
- `messages/` – translation messages per locale
- `prisma/` – Prisma schema, migrations, and seed
- `scripts/` – content utilities

## Prerequisites
- Node 18+
- pnpm 9+

## Getting started
1) Install dependencies
```sh
pnpm install
```

2) Configure environment variables
- Copy `.env.example` to `.env`
- Fill required secrets (NextAuth, DB URL, etc.)

3) Setup database (Prisma)
```sh
pnpm prisma migrate dev
pnpm prisma db seed
```

4) Run the dev server
```sh
pnpm dev
```
App runs on http://localhost:3000

## Content model
- News, pages, and other sections live under `content/{bg|en}/...`
- Lists typically have an `index.json`
- News posts can be Markdown (e.g., `content/bg/news/*.md`) with front‑matter parsed by the app

## i18n routing
- Localized routes are served from `app/[locale]/...`
- Middleware handles locale detection and redirects
- Switch locales via the `LocaleSwitcher` component

## Admin and API
- Admin UI under `app/admin`
- News API routes under `app/api/admin/news`
- Auth via NextAuth at `app/api/auth/[...nextauth]`

## Useful scripts
- `scripts/scrape-content.*` – content import utilities
- `scripts/set-placeholder-bodies.mjs` – fill body placeholders
- `scripts/update-team-index.mjs` – regenerate team index

## Build and deploy
```sh
pnpm build
pnpm start
```
- Designed to deploy easily to Vercel (or any Node host)

## Linting
```sh
pnpm lint
```

## Troubleshooting
- If Prisma types are missing, run `pnpm prisma generate`
- If migrations drift, run `pnpm prisma migrate reset` (dev only – drops data)
- Ensure `.env` matches your local DB setup

## License
MIT (c) project authors