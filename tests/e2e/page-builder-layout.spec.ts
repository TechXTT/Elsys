import { test, expect, type Page } from "@playwright/test";
import { adminLogin } from "./_helpers";

// QA (page-builder-overflow): the builder shell must fit beside the w-64 admin
// sidebar with no horizontal overflow — the right Properties panel and the
// action row must not be clipped off the right edge. We assert on layout MERIT
// (no element is laid out past the viewport) rather than relying on the
// overflow-x-hidden backstop, which would hide a real overflow.

const WIDTHS = [1280, 1440] as const;
const THEMES = ["light", "dark"] as const;

async function setTheme(page: Page, theme: string) {
  await page.context().addCookies([{ name: "theme", value: theme, url: "http://localhost:3000" }]);
  await page.addInitScript((t) => window.localStorage.setItem("elsys-theme", t), theme);
}

test.describe("Page builder layout fits beside the admin sidebar", () => {
  test("no horizontal overflow at 1280/1440 in light + dark", async ({ page }) => {
    await adminLogin(page);

    // Open the builder for the first available page (authenticated request reuses cookies).
    const res = await page.request.get("/api/admin/pages?locale=bg");
    const body = await res.json();
    const pageId: string | undefined = body?.pages?.[0]?.id;
    expect(pageId, "need a seeded page to open the builder").toBeTruthy();

    for (const theme of THEMES) {
      await setTheme(page, theme);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/admin/pages/${pageId}`);
        // Builder rendered (simple/advanced mode tabs come from PageBuilder).
        await page.locator('[data-ui="builder-mode"]').first().waitFor({ state: "visible" });

        const m = await page.evaluate(() => {
          const inner = window.innerWidth;
          let maxRight = 0;
          const offenders: string[] = [];
          for (const el of Array.from(document.body.querySelectorAll("*"))) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.right > maxRight) maxRight = r.right;
            if (r.right > inner + 2) offenders.push(`${el.tagName}.${(el as HTMLElement).className?.toString().slice(0, 40)} @${Math.round(r.right)}`);
          }
          const doc = document.scrollingElement!;
          return { inner, maxRight: Math.round(maxRight), scrollW: doc.scrollWidth, clientW: doc.clientWidth, offenders: offenders.slice(0, 5) };
        });

        // Merit: nothing laid out past the viewport (getBoundingClientRect is the
        // pre-clip layout box, so this catches overflow even with overflow-hidden).
        expect(m.offenders, `[${theme} @${width}] clipped elements: ${m.offenders.join(" | ")}`).toHaveLength(0);
        expect(m.maxRight, `[${theme} @${width}] rightmost edge`).toBeLessThanOrEqual(m.inner + 2);
        // Backstop: no document horizontal scrollbar.
        expect(m.scrollW, `[${theme} @${width}] document scrollWidth`).toBeLessThanOrEqual(m.clientW + 1);

        await page.screenshot({ path: `test-results/page-builder-${width}-${theme}.png`, fullPage: false });
      }
    }
  });
});
