import { test, expect } from "@playwright/test";

// QA (header-nav): the public header must render ONLY the curated nav roots
// (pages explicitly given a localized navLabel — see lib/navigation-build.ts),
// NOT every visible page. Legal pages, the "home" utility page, raw-slug
// imports and the za-nas route alias must never appear in the header.
test.describe("Public header navigation is curated", () => {
  // Curated bg roots seeded in prisma/seed.js (navRoots). The header section
  // pages without children render as plain links.
  const CURATED_BG = ["Новини", "Прием", "Обучение", "Училището", "Ученически живот"];
  // Must never leak into the header.
  const FORBIDDEN_HREF = ["/home", "/dostapnost", "/biskvitki", "/poveritelnost", "za-uchilishteto"];

  test("shows only curated roots, none of {home, legal pages, raw slugs}", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 }); // lg+ → desktop nav visible
    await page.goto("/bg");

    // The primary desktop nav (aria-label = localized "menu"); the search link
    // lives outside this <nav>, so these are exactly the curated root links.
    const nav = page.locator("header nav[aria-label]").first();
    const links = nav.locator('a[data-ui="nav"]');
    await expect(links.first()).toBeVisible();

    const texts = (await links.allInnerTexts()).map((t) => t.trim()).filter(Boolean);

    // Every curated root present...
    for (const label of CURATED_BG) expect(texts).toContain(label);

    // ...and the duplicate "За нас" alias is gone (Училището is canonical).
    expect(texts).not.toContain("За нас");

    // No forbidden destinations in the header at all.
    const hrefs = (await links.evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""))).join(" | ");
    for (const bad of FORBIDDEN_HREF) expect(hrefs).not.toContain(bad);

    // Curated set stays small (≤ 7 roots) so the bar never overflows.
    expect(texts.length).toBeLessThanOrEqual(7);
  });
});
