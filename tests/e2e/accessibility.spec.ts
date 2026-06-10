/**
 * WCAG 2.1 AA axe-core smoke checks on representative public pages.
 * Fails the CI build if any critical / serious violations are found.
 * See docs/PARITY_AND_IMPROVEMENT_PLAN.md §7.1 and §8.8.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_PAGES = ["/bg", "/bg/news", "/en", "/en/news"];

for (const path of PUBLIC_PAGES) {
  test(`no critical axe violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (serious.length > 0) {
      const summary = serious
        .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`)
        .join("\n");
      expect.soft(serious.length, `Axe violations on ${path}:\n${summary}`).toBe(0);
    }
  });
}
