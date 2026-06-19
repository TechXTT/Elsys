/**
 * I: dark-mode WCAG 2.1 AA smoke test. Asserts the dark token deltas resolve on
 * representative public + admin surfaces, and that the key fixed pairings
 * (on-action vs action-primary, borders vs surfaces) compute to AA in the
 * running app. Token values live in design/tokens.json → app/styles/tokens.css.
 */
import { test, expect, type Page } from "@playwright/test";

// sRGB relative-luminance contrast ratio for two #rrggbb strings.
function ratio(a: string, b: string): number {
  const lum = (hex: string) => {
    const m = hex.trim().replace("#", "").match(/.{2}/g)!;
    const [r, g, b] = m.map((h) => {
      const c = parseInt(h, 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = lum(a), l2 = lum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Activate dark mode the way the app does, then wait for the override to apply.
// Setting the persisted theme (localStorage "elsys-theme") BEFORE load is the key:
// the ThemeToggle mount effect reads it and KEEPS dark, instead of resetting
// data-theme to system (light) — which previously raced a post-load attribute set
// and made the spec read the light token. The waitForFunction blocks until the
// [data-theme="dark"] override is actually live (on-action no longer the light
// #FFFFFF), so styles are never read before dark applies.
async function gotoDark(page: Page, url: string) {
  await page.addInitScript(() => {
    try { window.localStorage.setItem("elsys-theme", "dark"); } catch { /* noop */ }
  });
  await page.goto(url);
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
  });
  await page.waitForFunction(() => {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-text-on-action").trim().toUpperCase();
    return v !== "" && v !== "#FFFFFF";
  });
}

async function tokens(page: Page, names: string[]): Promise<Record<string, string>> {
  return page.evaluate((vars) => {
    const s = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const v of vars) out[v] = s.getPropertyValue(v).trim();
    return out;
  }, names);
}

const KEYS = [
  "--color-text-on-action",
  "--color-action-primary",
  "--color-action-primary-hover",
  "--color-border-default",
  "--color-border-strong",
  "--color-bg-surface",
  "--color-bg-page",
  "--color-text-body",
];

test.describe("I — dark-mode AA", () => {
  test("public home resolves the dark token deltas and key pairings pass AA", async ({ page }) => {
    await gotoDark(page, "/bg");
    const t = await tokens(page, KEYS);

    // The Task-I token deltas are live in dark mode.
    expect(t["--color-text-on-action"].toUpperCase()).toBe("#042C53"); // navy, was white
    expect(t["--color-action-primary"].toUpperCase()).toBe("#5AACE9"); // brand/300, was brand/400
    expect(t["--color-border-default"].toUpperCase()).toBe("#7B8794"); // gray/500, was gray/700

    // Representative pairings compute to AA.
    expect(ratio(t["--color-text-on-action"], t["--color-action-primary"])).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t["--color-text-body"], t["--color-bg-page"])).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t["--color-border-default"], t["--color-bg-surface"])).toBeGreaterThanOrEqual(3);
  });

  test("a rendered filled action button has an AA-contrasting label in dark", async ({ page }) => {
    await gotoDark(page, "/bg");
    // Pick the first button actually filled with an opaque background (the
    // primary/action variant) — ghost/secondary buttons are transparent.
    const pair = await page.evaluate(() => {
      const toRgba = (s: string) => (s.match(/[\d.]+/g) || []).map(Number);
      for (const el of Array.from(document.querySelectorAll('[data-ui="button"]'))) {
        const cs = getComputedStyle(el as Element);
        const bg = toRgba(cs.backgroundColor);
        const opaque = bg.length >= 3 && (bg[3] === undefined || bg[3] >= 0.99) && (bg[0] + bg[1] + bg[2] > 0);
        if (opaque) return { color: cs.color, bg: cs.backgroundColor };
      }
      return null;
    });
    expect(pair, "expected at least one filled action button on /bg").not.toBeNull();
    const toHex = (rgb: string) => {
      const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
      return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
    };
    expect(ratio(toHex(pair!.color), toHex(pair!.bg))).toBeGreaterThanOrEqual(4.5);
  });

  test("admin login resolves dark tokens (admin internals are themed)", async ({ page }) => {
    await gotoDark(page, "/admin/login");
    const t = await tokens(page, ["--color-action-primary", "--color-text-on-action", "--color-border-default"]);
    expect(t["--color-action-primary"].toUpperCase()).toBe("#5AACE9");
    expect(ratio(t["--color-text-on-action"], t["--color-action-primary"])).toBeGreaterThanOrEqual(4.5);
  });
});
