import { test, expect, type Page } from "@playwright/test";
import { adminLogin } from "../e2e/_helpers";
import { compareToBaseline } from "./_compare";

// New-vs-own-baseline visual regression (M4.4). NOT legacy pixel-diff (the
// redesign differs by design). Separate suite — never gates the main build.
// `pnpm test:visual` diffs; `pnpm test:visual --update` refreshes baselines.

const THEMES = ["light", "dark"] as const;
const VIEWPORTS = { desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844 } } as const;

const PUBLIC_PAGES: { name: string; path: string }[] = [
  { name: "home", path: "/bg" },
  { name: "novini", path: "/bg/novini" },
  { name: "article", path: "/bg/novini/graduation-ceremony-2026" },
  { name: "priem", path: "/bg/priem" },
  { name: "za-uchilishteto", path: "/bg/za-uchilishteto" },
  { name: "kontakti", path: "/bg/kontakti" },
  { name: "galeria", path: "/bg/galeria" },
  { name: "klubove", path: "/bg/klubove" },
  { name: "dokumenti", path: "/bg/dokumenti" },
  { name: "search", path: "/bg/search?q=тует" },
  { name: "not-found", path: "/bg/this-page-does-not-exist-404" },
];

const ADMIN_PAGES: { name: string; path: string }[] = [
  { name: "admin-dashboard", path: "/admin" },
  { name: "admin-news", path: "/admin/news" },
  { name: "admin-editor", path: "/admin/news/simple" },
];

// Volatile regions to mask so dates / imported content / rotating media don't
// cause false regressions.
function masks(page: Page) {
  return [
    page.locator("time"),
    page.locator('[data-ui="news-card"]'),
    page.locator('[data-ui="carousel"]'),
    page.locator('[data-ui="volatile-time"]'), // relative times / current date (admin dashboard)
    page.locator("article time, .text-caption"),
  ];
}

async function prep(page: Page, theme: string, vp: { width: number; height: number }) {
  await page.setViewportSize(vp);
  await page.context().addCookies([
    { name: "theme", value: theme, url: "http://localhost:3000" },
    // Pre-dismiss the cookie banner so it never overlays the screenshot.
    { name: "cookie-consent", value: encodeURIComponent(JSON.stringify({ necessary: true, analytics: false, ts: 1 })), url: "http://localhost:3000" },
  ]);
  await page.addInitScript((t) => window.localStorage.setItem("elsys-theme", t), theme);
}

async function shoot(page: Page, name: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  const buf = await page.screenshot({ fullPage: true, animations: "disabled", mask: masks(page) });
  const res = compareToBaseline(name, buf);
  if (res.status === "regression") {
    throw new Error(`Visual regression on ${name}: ${res.note ?? `${((res.diffRatio ?? 0) * 100).toFixed(2)}% pixels changed`} → ${res.diffPath}`);
  }
  expect(["baseline-written", "match"]).toContain(res.status);
}

for (const theme of THEMES) {
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    test.describe(`public · ${theme} · ${vpName}`, () => {
      for (const p of PUBLIC_PAGES) {
        test(`${p.name}`, async ({ page }) => {
          await prep(page, theme, vp);
          await page.goto(p.path);
          await shoot(page, `${p.name}.${theme}.${vpName}`);
        });
      }
    });

    test.describe(`admin · ${theme} · ${vpName}`, () => {
      test.beforeEach(async ({ page }) => {
        await prep(page, theme, vp);
        await adminLogin(page);
      });
      for (const p of ADMIN_PAGES) {
        test(`${p.name}`, async ({ page }) => {
          await page.goto(p.path);
          await shoot(page, `${p.name}.${theme}.${vpName}`);
        });
      }
    });
  }
}
