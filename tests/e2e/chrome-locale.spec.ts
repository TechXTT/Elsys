import { test, expect } from "@playwright/test";

// LanguageSwitcher (Figma 20:10) — switches locale while preserving the path.
test.describe("LanguageSwitcher (Phase C)", () => {
  test("switches BG → EN keeping the current path", async ({ page }) => {
    await page.goto("/bg/ui-preview");

    const group = page.getByRole("group", { name: "Език" });
    await expect(group.getByRole("button", { name: "BG" })).toHaveAttribute("aria-current", "true");

    await group.getByRole("button", { name: "EN" }).click();

    await page.waitForURL(/\/en(\/|$)/);
    await expect(page).toHaveURL(/\/en\/ui-preview/);

    // EN is now the active locale.
    await expect(
      page.getByRole("group", { name: "Language" }).getByRole("button", { name: "EN" }),
    ).toHaveAttribute("aria-current", "true");
  });
});
