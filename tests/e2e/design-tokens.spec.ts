import { test, expect } from "@playwright/test";

/**
 * Design tokens — Phase A (Figma implementation plan §3).
 *
 * `app/styles/tokens.css` is generated from `design/tokens.json` (pnpm
 * tokens:generate) and exposes one canonical set of CSS custom properties:
 *   - light values on :root
 *   - dark values on [data-theme="dark"]
 *
 * This guards the two-mode wiring end-to-end (the generated stylesheet is
 * actually imported and the dark block overrides) plus the radius decision
 * (legacy --radius-lg 14px retired; tokens.json's 12px wins).
 */
// Production CSS minification collapses #ffffff -> #fff; normalize 3-digit hex
// back to 6-digit so assertions are stable across dev and built output.
const expandHex = (v: string) =>
  /^#[0-9a-f]{3}$/.test(v) ? "#" + [...v.slice(1)].map((c) => c + c).join("") : v;

test.describe("design tokens (Phase A)", () => {
  test("CSS variables resolve in light, and dark overrides apply", async ({ page }) => {
    await page.goto("/bg");

    // Light mode (Playwright defaults to prefers-color-scheme: light, no cookie).
    const light = await page.evaluate(() => {
      const read = (name: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim().toLowerCase();
      return {
        bgPage: read("--color-bg-page"),
        actionPrimary: read("--color-action-primary"),
        radiusLg: read("--radius-lg"),
        spacingMd: read("--spacing-md"),
      };
    });

    expect(expandHex(light.bgPage)).toBe("#ffffff");
    expect(expandHex(light.actionPrimary)).toBe("#0163b4"); // brand/600 (AA: white-on-primary 6.1:1)
    expect(light.radiusLg).toBe("12px"); // tokens.json wins over legacy 14px
    expect(light.spacingMd).toBe("16px");

    // Flip to dark via the data-theme mechanism (ThemeToggle arrives in Phase C).
    const dark = await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      const read = (name: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim().toLowerCase();
      return { bgPage: read("--color-bg-page"), textBody: read("--color-text-body") };
    });

    expect(expandHex(dark.bgPage)).toBe("#1f2933"); // gray.900
    expect(expandHex(dark.textBody)).toBe("#e4e7eb"); // gray.200
  });
});
