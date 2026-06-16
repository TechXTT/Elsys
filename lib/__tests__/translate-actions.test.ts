/**
 * J: the "Преведи на английски" Server Actions. DeepL is mocked, so this runs
 * with no live key. Asserts the action produces an EN review-draft (status
 * DRAFT + machineTranslated, never published) and that legal pages are excluded.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  session: { user: { id: "admin1", role: "ADMIN" } } as any,
  prisma: {
    newsPost: { findUnique: vi.fn(), upsert: vi.fn() },
    page: { findUnique: vi.fn(), upsert: vi.fn() },
  },
  recordAudit: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => h.session) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/headers", () => ({ headers: async () => ({ get: () => null }) }));
vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/audit", () => ({ recordAudit: h.recordAudit }));
vi.mock("@/lib/deepl", () => ({
  isDeeplConfigured: () => true,
  // Deterministic stand-in so the test needs no live DeepL key.
  translateText: async (text: string) => ({ text: `EN:${text}`, chars: text.length }),
  translateBlocks: async (blocks: unknown) => ({ blocks, chars: 0 }),
}));
vi.mock("@/lib/news", () => ({ invalidateNewsCache: vi.fn(), revalidateNews: vi.fn() }));
vi.mock("@/lib/cms/compile", () => ({ invalidatePageCache: vi.fn() }));
vi.mock("@/lib/navigation-cache", () => ({ invalidateNavigationCache: vi.fn() }));
vi.mock("@/lib/navigation-build", () => ({ invalidateNavigationTree: vi.fn() }));
vi.mock("@/lib/revalidate", () => ({ revalidatePublicPages: vi.fn() }));
vi.mock("@/lib/cache", () => ({ bumpCacheVersion: vi.fn() }));

import { translateNewsToEn } from "@/app/admin/news/actions";
import { translatePageToEn } from "@/app/admin/pages/actions";

beforeEach(() => vi.clearAllMocks());

describe("translateNewsToEn", () => {
  it("creates an EN review-draft (DRAFT + machineTranslated, never published)", async () => {
    h.prisma.newsPost.findUnique
      .mockResolvedValueOnce({
        id: "x", locale: "bg", title: "Заглавие", excerpt: "Резюме", bodyMarkdown: "тяло",
        blocks: null, useBlocks: false, date: new Date(), images: null, featuredImage: null,
        category: null, colorTag: null,
      })
      .mockResolvedValueOnce(null); // no existing EN row

    const r = await translateNewsToEn("x");
    expect(r.ok).toBe(true);
    expect(h.prisma.newsPost.upsert).toHaveBeenCalledTimes(1);
    const arg = h.prisma.newsPost.upsert.mock.calls[0][0];
    expect(arg.create.locale).toBe("en");
    expect(arg.create.status).toBe("DRAFT");
    expect(arg.create.published).toBe(false);
    expect(arg.create.machineTranslated).toBe(true);
    expect(arg.create.title).toBe("EN:Заглавие");
    expect(h.recordAudit).toHaveBeenCalled();
  });

  it("refuses to clobber a human-reviewed EN row", async () => {
    h.prisma.newsPost.findUnique
      .mockResolvedValueOnce({ id: "x", locale: "bg", title: "T", bodyMarkdown: "b", blocks: null, date: new Date() })
      .mockResolvedValueOnce({ machineTranslated: false }); // reviewed EN already exists

    const r = await translateNewsToEn("x");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("reviewed_exists");
    expect(h.prisma.newsPost.upsert).not.toHaveBeenCalled();
  });
});

describe("translatePageToEn", () => {
  it.each(["poveritelnost", "biskvitki", "dostapnost"])("excludes the legal page /%s", async (slug) => {
    h.prisma.page.findUnique.mockResolvedValueOnce({ id: "p", slug, locale: "bg" });
    const r = await translatePageToEn("p");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("excluded");
    expect(h.prisma.page.upsert).not.toHaveBeenCalled();
  });

  it("creates an EN review-draft for a normal page", async () => {
    h.prisma.page.findUnique
      .mockResolvedValueOnce({
        id: "p2", slug: "za-uchilishteto", locale: "bg", title: "Заглавие", excerpt: null,
        bodyMarkdown: "тяло", blocks: null, kind: "PAGE", groupId: null, authorId: "a",
      })
      .mockResolvedValueOnce(null);

    const r = await translatePageToEn("p2");
    expect(r.ok).toBe(true);
    const arg = h.prisma.page.upsert.mock.calls[0][0];
    expect(arg.create.locale).toBe("en");
    expect(arg.create.status).toBe("DRAFT");
    expect(arg.create.published).toBe(false);
    expect(arg.create.machineTranslated).toBe(true);
  });
});
