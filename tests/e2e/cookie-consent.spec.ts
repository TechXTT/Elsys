import { test, expect } from "@playwright/test";

// G5-4: cookie consent banner + preferences; analytics is opt-in (gated).

test.describe("Cookie consent (G5-4)", () => {
  test("banner appears, 'necessary only' dismisses it and sets no analytics", async ({ page, context }) => {
    await page.goto("/bg");
    const banner = page.locator('[data-ui="cookie-banner"]');
    await expect(banner).toBeVisible();

    await page.locator('[data-ui="accept-all"]').first().waitFor();
    await page.getByRole("button", { name: "Само необходими" }).click();
    await expect(banner).toBeHidden();

    const cookies = await context.cookies();
    const consent = cookies.find((c) => c.name === "cookie-consent");
    expect(consent).toBeTruthy();
    expect(decodeURIComponent(consent!.value)).toContain('"analytics":false');
  });

  test("preferences modal toggles analytics on and persists", async ({ page, context }) => {
    await page.goto("/bg");
    await page.getByRole("button", { name: "Настройки" }).click();
    const modal = page.getByRole("dialog", { name: "Настройки за бисквитки" });
    await expect(modal).toBeVisible();
    await modal.locator('[data-ui="analytics-toggle"]').check();
    await modal.locator('[data-ui="save-prefs"]').click();

    const consent = (await context.cookies()).find((c) => c.name === "cookie-consent");
    expect(decodeURIComponent(consent!.value)).toContain('"analytics":true');
  });
});
