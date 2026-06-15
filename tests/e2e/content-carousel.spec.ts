import { test, expect } from "@playwright/test";

// CarouselHero (Figma 29:11) — WCAG carousel: keyboard arrows, visible
// Pause/Play, and no auto-advance under 5s (design-system.md §3).
test.describe("CarouselHero a11y (Phase D)", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure auto-advance is enabled (it is gated behind prefers-reduced-motion).
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/bg/ui-preview");
  });

  test("keyboard arrows move between slides", async ({ page }) => {
    const carousel = page.getByTestId("carousel-light").locator('[data-ui="carousel-hero"]');
    const dots = carousel.locator('[data-ui="carousel-dot"]');

    await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");

    await carousel.locator('[data-ui="carousel-next"]').focus();
    await page.keyboard.press("ArrowRight");
    await expect(dots.nth(1)).toHaveAttribute("aria-current", "true");

    await page.keyboard.press("ArrowLeft");
    await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");
  });

  test("Pause/Play toggles auto-advance and there is no auto-advance under 5s", async ({ page }) => {
    const carousel = page.getByTestId("carousel-light").locator('[data-ui="carousel-hero"]');
    const dots = carousel.locator('[data-ui="carousel-dot"]');
    const pause = carousel.locator('[data-ui="carousel-pause"]');

    // Auto-advance becomes active after mount (no reduced motion).
    await expect(pause).toHaveAttribute("aria-pressed", "true");

    // No auto-advance under 5s: still on the first slide after 4.5s.
    await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");
    await page.waitForTimeout(4500);
    await expect(dots.nth(0)).toHaveAttribute("aria-current", "true");

    // Pausing stops playback.
    await pause.click();
    await expect(pause).toHaveAttribute("aria-pressed", "false");
  });
});
