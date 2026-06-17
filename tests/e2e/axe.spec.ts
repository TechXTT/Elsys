import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { adminLogin as login } from "./_helpers";

// M5.5: axe accessibility scan on key public + admin pages. AA is a hard
// requirement — we fail on serious/critical WCAG 2.0/2.1 A/AA violations.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// Strict AA (M5.5): the muted-ink token was darkened to gray/700 so no marginal
// allowance remains — we fail on every serious/critical WCAG A/AA violation,
// including any color-contrast under 4.5:1.
async function scan(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  if (blocking.length) {
    console.log("AXE blocking:", JSON.stringify(blocking.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, summary: n.failureSummary?.split("\n").slice(0, 2).join(" ") })),
    })), null, 2));
  }
  return blocking;
}

const PUBLIC_PAGES = ["/bg", "/bg/novini", "/bg/dokumenti", "/bg/galeria", "/bg/ekip", "/bg/kontakti", "/bg/evroproekti"];

test.describe("Accessibility — public (M5.5)", () => {
  for (const path of PUBLIC_PAGES) {
    test(`no serious/critical AA violations: ${path}`, async ({ page }) => {
      await page.goto(path);
      // Dismiss the cookie banner so it doesn't mask page content in the scan.
      await page.getByRole("button", { name: /Само необходими|Necessary only/ }).click().catch(() => {});
      const blocking = await scan(page);
      expect(blocking, blocking.map((v) => v.id).join(", ")).toEqual([]);
    });
  }
});

test.describe("Accessibility — admin (M5.5)", () => {
  test("admin login page", async ({ page }) => {
    await page.goto("/admin/login");
    expect(await scan(page)).toEqual([]);
  });

  test("admin dashboard + media + help", async ({ page }) => {
    await login(page);
    for (const path of ["/admin", "/admin/media", "/admin/help"]) {
      await page.goto(path);
      const blocking = await scan(page);
      expect(blocking, `${path}: ${blocking.map((v) => v.id).join(", ")}`).toEqual([]);
    }
  });
});
