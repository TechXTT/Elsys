import { locales } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { getNewsPosts } from "@/lib/news";

export const revalidate = 300;

// Dedicated news sitemap (R2). Reads published posts via getNewsPosts(), which
// gates on publicWhere({ gateDate: true }) — only PUBLISHED, non-future posts.
export async function GET() {
  const urls: { loc: string; lastmod?: string }[] = [];
  for (const locale of locales) {
    const posts = await getNewsPosts(locale).catch(() => []);
    for (const p of posts) {
      urls.push({ loc: absoluteUrl(`/${locale}/novini/${p.id}`), lastmod: p.date });
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}</url>`)
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}
