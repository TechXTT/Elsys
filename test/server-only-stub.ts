// No-op stub for Next.js' `server-only` / `client-only` marker packages.
//
// These packages exist only to make the bundler throw if a server/client module
// is imported from the wrong environment; Next.js resolves them at build time.
// Under vitest's plain node resolution they aren't installed, so importing a
// module that begins with `import "server-only"` (e.g. lib/auth/guard.ts) fails
// with ERR_MODULE_NOT_FOUND. vitest.config.ts aliases both markers here so unit
// tests can import server modules without pulling in the bundler.
export {};
