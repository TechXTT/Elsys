import { test, expect } from "@playwright/test";

// SearchBar primitive — Phase B (Figma 18:7). Pill, surface, leading magnifier.
test.describe("SearchBar (Phase B)", () => {
  test("expanded searchbox is a labelled pill; collapsed is a labelled icon button", async ({
    page,
  }) => {
    await page.goto("/bg/ui-preview");
    const section = page.getByTestId("preview-searchbar");

    const search = section.getByRole("searchbox", { name: "Търсене" });
    await expect(search).toBeVisible();
    expect(
      await search.evaluate((el) => {
        const cs = getComputedStyle(el as HTMLElement);
        return { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius };
      }),
    ).toMatchObject({
      bg: "rgb(255, 255, 255)", // --color-bg-surface
      radius: "9999px", // --radius-full
    });

    // Collapsed variant: an icon-only button carrying the accessible label.
    await expect(section.getByRole("button", { name: "Търсене" })).toBeVisible();
  });
});
