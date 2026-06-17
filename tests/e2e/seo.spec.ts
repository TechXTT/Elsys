import { test, expect } from "@playwright/test";

// R2 SEO residue: OG-image route, news sitemap, and SEO field overrides.

test.describe("SEO (R2)", () => {
  test("OG-image route renders an image", async ({ request }) => {
    const res = await request.get("/og?title=Test&subtitle=Sub");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image");
  });

  test("news sitemap lists published articles", async ({ request }) => {
    const res = await request.get("/sitemap-news.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("/novini/");
  });

  test("a post's metaTitle override drives the document title", async ({ page }) => {
    // Seeded post m24-categorized-news has metaTitle "Прием 2026 — SEO заглавие".
    await page.goto("/bg/novini/m24-categorized-news");
    await expect(page).toHaveTitle(/Прием 2026 — SEO заглавие/);
  });
});
