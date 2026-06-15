import { test, expect } from "@playwright/test";

// M0.3: route-alias resolution moved out of middleware into the [...slug] resolver
// (lib/routes.ts), and /api/route-alias was deleted. Fixtures are seeded in
// prisma/seed.js: page slug "za-uchilishteto" + a kind=ROUTE alias whose
// routeOverride "za-nas" maps (catch-all routePath "[...slug]") onto it.
test.describe("route alias resolution (M0.3)", () => {
  const CANONICAL = "/bg/za-uchilishteto";
  const ALIASED = "/bg/za-nas/za-uchilishteto";

  test("aliased URL renders the same content as its canonical route", async ({ page }) => {
    await page.goto(CANONICAL);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("За училището");

    await page.goto(ALIASED);
    // Same page, resolved through the alias — heading + block content match the
    // canonical route (E2 recomposed this page from blocks).
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("За училището");
    await expect(page.getByText(/водещо професионално училище/)).toBeVisible();
  });

  test("/api/route-alias no longer exists (404)", async ({ request }) => {
    const res = await request.get("/api/route-alias?locale=bg&path=za-nas");
    expect(res.status()).toBe(404);
  });
});
