import { test, expect } from "@playwright/test";

// Mobile drawer (Figma 37:65 Mobile) — open, focus trapped, Esc closes and
// returns focus to the hamburger.
test.describe("Mobile drawer (Phase C)", () => {
  test("opens, moves focus inside, closes on Esc, restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/bg/ui-preview");

    const hamburger = page.getByRole("button", { name: "Отваряне на менюто" });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    const dialog = page.getByRole("dialog", { name: "Меню" });
    await expect(dialog).toBeVisible();

    // Focus moved into the drawer.
    expect(
      await page.evaluate(() => document.getElementById("mobile-drawer")?.contains(document.activeElement) ?? false),
    ).toBe(true);

    // Esc closes and returns focus to the hamburger.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await hamburger.evaluate((el) => el === document.activeElement)).toBe(true);
  });
});
