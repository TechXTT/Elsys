import { test, expect, type APIResponse } from "@playwright/test";
import { adminLogin } from "./_helpers";

// Regression: GET /api/admin/navigation must be side-effect-free. It used to call
// ensureNavigationLocaleCoverage(), which CREATED locale-suffixed "ghost" pages on
// every load. The proof is repeated-load STABILITY — a single clean read was the
// trap before. Two sequential GETs must return the same node count and never any
// `*-bg`/`*-en` ghost or junk slug.

function flatten(items: any[]): any[] {
  const out: any[] = [];
  const walk = (ns: any[]) => { for (const n of ns) { out.push(n); if (Array.isArray(n.children)) walk(n.children); } };
  walk(items ?? []);
  return out;
}

async function navNodes(res: APIResponse) {
  const json = await res.json();
  return flatten(json.items ?? []);
}

test.describe("admin nav GET is side-effect-free", () => {
  for (const locale of ["bg", "en"]) {
    test(`repeated GET (${locale}) is stable, no ghosts/junk`, async ({ page }) => {
      await adminLogin(page);

      const r1 = await page.request.get(`/api/admin/navigation?locale=${locale}`);
      expect(r1.ok()).toBeTruthy();
      const n1 = await navNodes(r1);

      const r2 = await page.request.get(`/api/admin/navigation?locale=${locale}`);
      expect(r2.ok()).toBeTruthy();
      const n2 = await navNodes(r2);

      // Stability: a second load must not have grown the tree (no rows created).
      expect(n2.length, `[${locale}] node count must be stable across loads`).toBe(n1.length);

      // No ghost or junk slugs anywhere in either payload.
      const slugs = [...n1, ...n2].flatMap((n) => [n.slug, ...Object.values(n.slugByLocale ?? {})]).filter(Boolean) as string[];
      const bad = slugs.filter((s) => /-(bg|en)$/.test(s) || s === "galleries/xhr" || s.startsWith("novini-i-sybitija"));
      expect(bad, `[${locale}] ghost/junk slugs present: ${bad.join(", ")}`).toHaveLength(0);
    });
  }
});
