import { test, expect } from "@playwright/test";

// Pagination primitive — Phase B (Figma 19:8). Current cell brand/600 + white.
test.describe("Pagination (Phase B)", () => {
  test("current cell is marked + brand-filled; prev/next are reachable mid-range", async ({
    page,
  }) => {
    await page.goto("/bg/ui-preview");
    const nav = page.getByTestId("preview-pagination").getByRole("navigation", {
      name: "Странициране",
    });

    const current = nav.locator('[aria-current="page"]');
    await expect(current).toHaveText("3");
    expect(
      await current.evaluate((el) => {
        const cs = getComputedStyle(el as HTMLElement);
        return { bg: cs.backgroundColor, color: cs.color };
      }),
    ).toMatchObject({
      bg: "rgb(1, 99, 180)", // --color-action-primary #0163b4 (brand/600, AA with white)
      color: "rgb(255, 255, 255)", // --color-text-on-brand
    });

    // Page 3 of 10 → both prev and next are links (not disabled spans).
    await expect(nav.getByRole("link", { name: "Предишна страница" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Следваща страница" })).toBeVisible();
  });
});
