import { test, expect } from "@playwright/test";

// M0.5: every seeded image reference must resolve. News cards render <img
// src="/images/news/*.svg">; a missing asset shows as a broken image
// (naturalWidth === 0). This asserts images actually LOAD, not just that <img>
// tags are present.
test.describe("seed image integrity (M0.5)", () => {
  test("/bg/news has no broken images", async ({ page }) => {
    await page.goto("/bg/news");

    const result = await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      );
      return {
        total: imgs.length,
        broken: imgs.filter((img) => img.naturalWidth === 0).map((img) => img.currentSrc || img.src),
        // Missing = the alt attribute is absent entirely. An explicit alt=""
        // is the WCAG-correct decorative declaration (Phase D NewsCard covers
        // are decorative — the whole card is one link named by its title).
        missingAlt: imgs.filter((img) => img.getAttribute("alt") === null).length,
      };
    });

    // The seeded news cards must actually render images (guard against a vacuous pass).
    expect(result.total).toBeGreaterThan(0);
    expect(result.broken).toEqual([]);
    // Every image must DECLARE alt (empty for decorative, descriptive otherwise) — WCAG 2.1 AA.
    expect(result.missingAlt).toBe(0);
  });
});
