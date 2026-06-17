import { defineConfig, devices } from "@playwright/test";

// Visual-regression suite (M4.4) — SEPARATE from the main e2e config so flaky
// pixel diffs never gate the build/CI. Run with `pnpm test:visual`.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/visual",
  timeout: 60_000,
  retries: 0,
  workers: 1, // deterministic screenshots (shared server + theme cookie)
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    port: 3000,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      REDIS_URL: process.env.REDIS_URL ?? "",
      TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY ?? "VbeDo/97t5ZKj36M3TlkM5pFLsyFCly/DGLOKH0bdWw=",
    },
  },
});
