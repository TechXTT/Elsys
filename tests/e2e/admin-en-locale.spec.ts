import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// fix/admin-en-locale: the admin locale toggle (admin-locale cookie) must apply to
// BOTH client chrome AND server-rendered page bodies. Asserts on CHROME/shell only
// — post titles + recent-news are real Bulgarian DATA and stay Cyrillic in EN.
const CYRILLIC = /[Ѐ-ӿ]/;

test.describe("Admin locale fully applies (server + client)", () => {
  test("EN: admin chrome has no Cyrillic, no console errors", async ({ page, context }) => {
    await login(page);
    await context.addCookies([{ name: "admin-locale", value: "en", url: "http://localhost:3000" }]);

    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));

    // /admin/content — fully chrome (header + card titles + record counts).
    await page.goto("/admin/content");
    const contentH1 = await page.locator("h1").first().innerText();
    expect(CYRILLIC.test(contentH1), `content h1 should be EN: "${contentH1}"`).toBeFalsy();
    for (const txt of await page.locator('a[href^="/admin/content/"] p').allInnerTexts()) {
      expect(CYRILLIC.test(txt), `content card should be EN: "${txt}"`).toBeFalsy();
    }

    // /admin/news — header shell (h1 + "+ Simple editor" button); skip the post list (data).
    await page.goto("/admin/news");
    const newsH1 = await page.locator("h1").first().innerText();
    expect(CYRILLIC.test(newsH1), `news h1 should be EN: "${newsH1}"`).toBeFalsy();
    await expect(page.getByRole("link", { name: /Simple editor/ })).toBeVisible();

    // /admin — sidebar chrome localized (Dashboard, not Табло).
    await page.goto("/admin");
    await expect(page.getByText("Dashboard").first()).toBeVisible();

    const intl = errors.filter((e) => /IntlError|INVALID_KEY|MISSING_MESSAGE/i.test(e));
    expect(intl, `next-intl errors: ${intl.join(" | ")}`).toHaveLength(0);
  });

  test("BG: admin chrome is Bulgarian (no regression)", async ({ page, context }) => {
    await login(page);
    await context.addCookies([{ name: "admin-locale", value: "bg", url: "http://localhost:3000" }]);

    await page.goto("/admin/content");
    const contentH1 = await page.locator("h1").first().innerText();
    expect(CYRILLIC.test(contentH1), `content h1 should be BG: "${contentH1}"`).toBeTruthy();

    await page.goto("/admin/news");
    const newsH1 = await page.locator("h1").first().innerText();
    expect(CYRILLIC.test(newsH1), `news h1 should be BG: "${newsH1}"`).toBeTruthy();
  });
});
