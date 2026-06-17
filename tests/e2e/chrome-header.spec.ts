import { test, expect } from "@playwright/test";

// SiteHeader (Figma 37:65) — Default (brand) vs Scrolled (surface + border).
test.describe("SiteHeader scroll state (Phase C)", () => {
  test("switches from brand bar to surface + bottom border on scroll", async ({ page }) => {
    await page.goto("/bg/ui-preview");
    const header = page.locator("header").first();

    // Default: brand/600 bar.
    await expect
      .poll(() => header.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe("rgb(1, 99, 180)"); // --color-bg-header #0163b4

    await page.evaluate(() => window.scrollTo(0, 400));

    // Scrolled: surface bg + 1px bottom border.
    await expect
      .poll(() => header.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toBe("rgb(255, 255, 255)"); // --color-bg-surface
    expect(await header.evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe("1px");
  });
});
