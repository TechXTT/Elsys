import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

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

  test("creates a published post that appears publicly", async ({ page }) => {
    const stamp = Date.now();
    const title = `Опростена новина ${stamp}`;

    await page.goto("/admin/news/simple");
    await page.fill('input[name="title"]', title);
    await page.getByRole("radio", { name: "Зелено" }).click();
    await page.getByRole("button", { name: "Публикувай" }).click();

    // Redirects to the news admin list on success.
    await page.waitForURL(/\/admin\/news$/);

    // Published post is visible on the public index.
    await page.goto("/bg/novini");
    await expect(page.getByText(title)).toBeVisible();
  });
});
