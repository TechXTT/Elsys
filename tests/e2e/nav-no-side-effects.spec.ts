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

  // Cross-locale nesting parity: the EN projection must MIRROR the bg tree shape.
  // (Earlier the projection attached virtual children by raw page id, so EN
  // children orphaned to root under a real EN parent — 67 EN roots vs 18 bg.)
  test("EN tree shape mirrors bg (root count + per-parent child counts)", async ({ page }) => {
    await adminLogin(page);
    const shape = async (locale: string) => {
      const res = await page.request.get(`/api/admin/navigation?locale=${locale}`);
      expect(res.ok()).toBeTruthy();
      const items = (await res.json()).items ?? [];
      // Stable cross-locale key = the bg slug of each group (groupId-merged).
      const childCountByKey: Record<string, number> = {};
      const walk = (ns: any[]) => { for (const n of ns) { const key = n.slugByLocale?.bg ?? n.slug; childCountByKey[key] = (n.children ?? []).length; walk(n.children ?? []); } };
      walk(items);
      return { roots: items.length, childCountByKey };
    };
    const bg = await shape("bg");
    const en = await shape("en");

    expect(en.roots, `EN root count must equal bg (${bg.roots})`).toBe(bg.roots);
    expect(Object.keys(en.childCountByKey).sort(), "same set of nodes in both locales").toEqual(Object.keys(bg.childCountByKey).sort());
    for (const key of Object.keys(bg.childCountByKey)) {
      expect(en.childCountByKey[key], `child count for "${key}" must match bg`).toBe(bg.childCountByKey[key]);
    }
  });
});
