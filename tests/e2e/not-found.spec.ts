import { test, expect } from "@playwright/test";

// E3: unknown routes 404 via the [locale]/not-found boundary (Figma 76:3).
test.describe("404 (Phase E3)", () => {
  test("an unknown route returns 404 with the designed not-found page", async ({ page }) => {
    const res = await page.goto("/bg/nesashtestvuvashta-stranica-xyz-123");
    expect(res?.status()).toBe(404);

    await expect(page.getByRole("heading", { name: "Страницата не е намерена" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Към началото" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Търсене" })).toBeVisible();
  });
});
