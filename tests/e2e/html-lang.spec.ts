/**
 * K: <html lang> must reflect the URL locale on a COLD request (WCAG 3.1.1),
 * not just after a NEXT_LOCALE cookie exists. Middleware passes the resolved
 * locale to the root layout via the x-next-locale request header. Each test
 * uses a fresh context (no cookies) so only the header drives the result.
 */
import { test, expect } from "@playwright/test";

test.describe("K — <html lang> per URL (cold request)", () => {
  for (const path of ["/en", "/en/novini"]) {
    test(`${path} serves <html lang="en">`, async ({ browser }) => {
      const ctx = await browser.newContext(); // cold: no NEXT_LOCALE cookie
      const page = await ctx.newPage();
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await ctx.close();
    });
  }

  for (const path of ["/bg", "/bg/novini"]) {
    test(`${path} serves <html lang="bg">`, async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "bg");
      await ctx.close();
    });
  }
});
