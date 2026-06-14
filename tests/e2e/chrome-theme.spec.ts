import { test, expect } from "@playwright/test";

// ThemeToggle (Figma 20:17) — flips data-theme on <html>, persists across reload.
test.describe("ThemeToggle persistence (Phase C)", () => {
  test("toggles data-theme, persists to storage and survives reload", async ({ page }) => {
    await page.goto("/bg/ui-preview");

    const toggle = page.getByRole("button", { name: "Превключване на тема" });
    await expect(toggle).toBeVisible();

    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    await toggle.click();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .not.toBe(before);

    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(await page.evaluate(() => localStorage.getItem("elsys-theme"))).toBe(after);

    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(after);
  });
});
