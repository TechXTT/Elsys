import { test, expect } from "@playwright/test";

// Happy-path for the Club admin slice (Phase 2.3 — admin only; public ClubGrid/route is M2.3).
// NOTE: the create/edit flow (/admin/content/[type]/new) is currently broken for ALL content
// types — the generic scaffold passes the Zod `schema` (a class instance) from a Server
// Component into the client ContentForm, which is not RSC-serializable and hangs the response.
// See TODO logged in docs/PLAN.md. Once fixed, extend this spec with a create assertion.
test.describe("Club admin slice (Phase 2.3)", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin (login inputs are type-based, not name-based)
    await page.goto("/admin/login");
    await page.fill('input[type="email"]', process.env.TEST_ADMIN_EMAIL ?? "admin@elsys.bg");
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD ?? "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin$/);
  });

  test("club list renders and shows a seeded club", async ({ page }) => {
    await page.goto("/admin/content/club");
    await expect(page.getByRole("heading")).toContainText("Клубове");
    // Seeded club from prisma/seed.js
    await expect(page.getByText("Роботика и автоматизация")).toBeVisible();
  });
});
