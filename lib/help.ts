import { prisma } from "@/lib/prisma";

// Admin help-center reads (G5-2). Admin-only surface; the school edits these via
// the content framework (/admin/content/help). Includes DRAFTs (runbooks ship
// as editable drafts), since this is staff-only.

export interface HelpArticleView {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  icon: string | null;
  status: string;
}

export async function listHelpArticles(): Promise<HelpArticleView[]> {
  return prisma.helpArticle.findMany({
    select: { id: true, slug: true, title: true, summary: true, icon: true, status: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
  });
}

export async function getHelpArticle(slug: string) {
  return prisma.helpArticle.findUnique({
    where: { slug },
    select: { slug: true, title: true, summary: true, body: true, status: true },
  });
}
