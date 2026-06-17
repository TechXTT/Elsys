import { test, expect } from "@playwright/test";

// HeaderAccent (Figma 28:26) — dismissible announcement bar; dismissal persists
// per id in localStorage.
test.describe("HeaderAccent dismiss (Phase D)", () => {
  test("dismisses the info banner and stays dismissed across reload", async ({ page }) => {
    await page.goto("/bg/ui-preview");

    const panel = page.getByTestId("headeraccent-light");
    const info = panel.locator('[data-priority="info"]');
    await expect(info).toBeVisible();

    await info.locator('[data-ui="header-accent-dismiss"]').click();
    await expect(info).toHaveCount(0);

    // Persisted: key set, banner gone after reload.
    expect(await page.evaluate(() => localStorage.getItem("elsys-accent-dismissed:preview-info"))).toBe("1");
    await page.reload();
    await expect(page.getByTestId("headeraccent-light").locator('[data-priority="info"]')).toHaveCount(0);
  });
});
