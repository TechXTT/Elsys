import { test, expect } from "@playwright/test";
import { adminLogin as login } from "./_helpers";

// M0.4 (R3): Page/NewsPost visibility flows through the canonical isPublic() helper
// (status PUBLISHED + date gate). Fixtures seeded in prisma/seed.js.
test.describe("publish status (M0.4 / R3)", () => {
  test("a DRAFT page 404s publicly but lists in admin", async ({ page }) => {
    // Public: the seeded DRAFT page must 404 (E3 wired notFound) and not render.
    const pageRes = await page.goto("/bg/chernova-stranica");
    expect(pageRes?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Страницата не е намерена" })).toBeVisible();
    await expect(
      page.getByText("Това е чернова и не трябва да е видима публично.")
    ).toHaveCount(0);

    // Admin: it must still be listed (admin reads are not status-gated, unlike public).
    await login(page);
    const res = await page.request.get("/api/admin/pages");
    expect(res.ok()).toBeTruthy();
    expect(await res.text()).toContain("chernova-stranica");
  });

  test("a future-dated published news post is hidden, then visible after its date passes", async ({ page }) => {
    const TITLE = "Насрочена новина (M0.4)";

    await login(page);
    // "Manipulate the seed date, not the clock": flip the publish date through the
    // admin API so the SERVER invalidates its news cache + revalidates. Idempotent
    // (resets to future first / restores it at the end) so re-runs against a
    // persistent dev DB behave like CI's fresh seed.
    const setDate = async (date: string) => {
      const res = await page.request.put("/api/admin/news/m04-scheduled-news", {
        multipart: {
          title: TITLE,
          slug: "m04-scheduled-news",
          locale: "bg",
          markdown: "Тази новина е насрочена за бъдеща дата.",
          date,
          published: "true",
        },
      });
      expect(res.ok()).toBeTruthy();
    };

    // Verify via the article page (getNewsPost reads the DB live) so the result
    // is deterministic regardless of how many other posts crowd the paginated
    // /novini index. Future date → article 404s (isPublic gates a future date).
    const ARTICLE = "/bg/novini/m04-scheduled-news";
    await setDate("2099-01-01");
    await expect(async () => {
      const res = await page.goto(ARTICLE);
      expect(res?.status()).toBe(404);
    }).toPass({ timeout: 15_000 });

    // Date passes → the article renders.
    await setDate("2026-06-10");
    await expect(async () => {
      const res = await page.goto(ARTICLE);
      expect(res?.status()).toBe(200);
      await expect(page.locator("article h1")).toContainText(TITLE);
    }).toPass({ timeout: 15_000 });

    // Restore the future date so the fixture is reusable.
    await setDate("2099-01-01");
  });
});
