/**
 * H: the three footer-linked legal pages must resolve (not 404) and each must
 * carry the draft-review notice (these are templates pending legal sign-off).
 * Seeded as block pages in prisma/seed.js — run: pnpm prisma db seed.
 */
import { test, expect } from "@playwright/test";

const NOTICE = /Чернова — подлежи на правен преглед преди публикуване/i;

const PAGES = [
  { path: "/bg/poveritelnost", heading: "Политика за поверителност" },
  { path: "/bg/biskvitki", heading: "Политика за бисквитките" },
  { path: "/bg/dostapnost", heading: "Декларация за достъпност" },
];

test.describe("H — legal pages", () => {
  for (const { path, heading } of PAGES) {
    test(`${path} renders with one h1 and the draft-review notice`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${path} should not 404`).toBeLessThan(400);

      // Exactly one h1, and it is the page title.
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(heading);

      // The draft-review notice is present and visible.
      await expect(page.getByText(NOTICE).first()).toBeVisible();
    });
  }

  test("/en/dostapnost falls back to bg content (untranslated) and still resolves", async ({ page }) => {
    const res = await page.goto("/en/dostapnost");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByText(NOTICE).first()).toBeVisible();
  });

  test("footer links to the three legal pages resolve from the home page", async ({ page }) => {
    await page.goto("/bg");
    for (const { path } of PAGES) {
      await expect(page.locator(`footer a[href="${path}"]`).first()).toBeVisible();
    }
  });
});
