import { test, expect } from "@playwright/test";

/**
 * Hydration guard (M0.1).
 *
 * Regression test for a class of failure where every page server-renders fine
 * but never hydrates: the client bundle loads, RSC payload is present, webpack
 * chunks register — but the webpack runtime never boots (e.g. a malformed
 * runtime chunk), so `hydrateRoot` never runs. Symptoms: `window.next` stays
 * undefined, no React fibers attach, and interactive controls are dead.
 *
 * A DOM-presence assertion would pass against a dead page, so this test asserts
 * real interactivity: the locale switcher is a client-only <button> (no href)
 * that calls router.replace — it can only navigate if the page hydrated.
 */
test.describe("client hydration", () => {
  test("locale switcher navigates /bg -> /en (page is interactive)", async ({ page }) => {
    await page.goto("/bg");

    // Sanity: the Next.js client runtime booted (undefined when hydration dies).
    await expect
      .poll(() => page.evaluate(() => typeof (window as unknown as { next?: unknown }).next), {
        timeout: 10_000,
      })
      .toBe("object");

    // The LanguageSwitcher (group "Език") exposes BG/EN buttons; clicking EN
    // can only navigate if the page hydrated.
    await page.getByRole("group", { name: "Език" }).getByRole("button", { name: "EN" }).click();

    // Real client-side navigation must occur — fails if the button is dead.
    await page.waitForURL(/\/en(\/|$)/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/en(\/|$)/);
  });
});
