import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";
import { slugify } from "../../lib/slug";

// G3-1: Simple Mode news editor (Figma 95:2) — Sweboo-parity one screen.

test.describe("News Simple Mode editor (G3-1)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("renders the one-screen form with mode toggle and aside", async ({ page }) => {
    await page.goto("/admin/news/simple");
    await expect(page.getByRole("heading", { name: "Нова новина" })).toBeVisible();
    await expect(page.getByText("Опростен", { exact: true })).toBeVisible();
    await expect(page.getByText("Разширен", { exact: true })).toBeVisible();
    await expect(page.getByText("Категория", { exact: true })).toBeVisible();
    await expect(page.getByText("Featured изображение")).toBeVisible();
  });

  test("admin pages emit no next-intl errors (IntlError/INVALID_KEY guard)", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    for (const path of ["/admin", "/admin/news", "/admin/news/simple"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
    }
    const intl = errors.filter((e) => /IntlError|INVALID_KEY|MISSING_MESSAGE/i.test(e));
    expect(intl, `next-intl errors present: ${intl.join(" | ")}`).toHaveLength(0);
  });

  test("creates a published post that appears publicly", async ({ page }) => {
    const stamp = Date.now();
    const title = `Опростена новина ${stamp}`;

    await page.goto("/admin/news/simple");
    await page.fill('input[name="title"]', title);
    await page.getByRole("radio", { name: "Зелено" }).click();
    await page.getByRole("button", { name: "Публикувай" }).click();

    // Redirects to the news admin list on success.
    await page.waitForURL(/\/admin\/news$/);

    // The published post's article resolves and renders. Navigate directly to
    // the auto-derived (Latin) slug: getNewsPost reads the DB live (no list
    // cache), so this is deterministic under parallel load — and it verifies the
    // slug round-trips through the public article route.
    await page.goto(`/bg/novini/${slugify(title)}`);
    await expect(page.locator("article h1")).toContainText(title, { timeout: 15000 });
  });
});
