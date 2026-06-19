import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  // Clean e2e-marker rows (Test Slide/Club E2E <ts>, Опростена новина <ts>) after
  // the run so they don't accumulate in the shared dev DB. The seeded 2099
  // "Насрочена новина (M0.4)" fixture is never matched.
  globalTeardown: "./tests/global-teardown.ts",
  timeout: 30_000,
  retries: isCI ? 2 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm start",
    port: 3000,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      REDIS_URL: process.env.REDIS_URL ?? "",
      // Fixed dev/test key so the seeded 2FA admin's secret decrypts in the test
      // server (must match prisma/seed.js TEST_TOTP_KEY). Prod sets a real key.
      TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY ?? "VbeDo/97t5ZKj36M3TlkM5pFLsyFCly/DGLOKH0bdWw=",
    },
  },
});
