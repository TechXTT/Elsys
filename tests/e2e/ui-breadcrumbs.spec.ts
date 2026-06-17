import { test, expect } from "@playwright/test";

// Breadcrumbs primitive — Phase B (Figma 19:2). Links + muted separators + current.
test.describe("Breadcrumbs (Phase B)", () => {
  test("links are navigable; the last crumb is the marked current page", async ({ page }) => {
    await page.goto("/bg/ui-preview");
    const nav = page.getByTestId("preview-breadcrumbs").getByRole("navigation", {
      name: "Навигация",
    });

    // Intermediate crumbs are links, coloured with --color-text-link.
    const home = nav.getByRole("link", { name: "Начало" });
    await expect(home).toHaveAttribute("href", "/bg");
    expect(await home.evaluate((el) => getComputedStyle(el as HTMLElement).color)).toBe(
      "rgb(1, 99, 180)", // --color-text-link #0163b4
    );

    // Current page is a non-link span with aria-current.
    const current = nav.locator('[aria-current="page"]');
    await expect(current).toHaveText("Документи");
    expect(await current.evaluate((el) => el.tagName)).toBe("SPAN");
  });
});
