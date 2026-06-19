/* eslint-disable no-console */
// Playwright globalTeardown: after the whole run, delete the e2e artifacts that
// otherwise pile up in the shared dev DB — carousel "Test Slide E2E <ts>", club
// "Test Club E2E <ts>", and simplified-news "Опростена новина <ts>". Matched by
// the exact e2e markers only; the seeded "Насрочена новина (M0.4)" (01/01/2099)
// fixture is never touched.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export default async function globalTeardown() {
  if (!process.env.PRISMA_DATABASE_URL) return;
  const prisma = new PrismaClient();
  try {
    const news = await prisma.newsPost.findMany({ where: { title: { startsWith: "Опростена новина " } }, select: { id: true } });
    const newsIds = news.map((r) => r.id);
    if (newsIds.length) await prisma.newsPostVersion.deleteMany({ where: { newsPostId: { in: newsIds } } });
    const [c, cl, n] = await Promise.all([
      prisma.carousel.deleteMany({ where: { title: { startsWith: "Test Slide E2E " } } }),
      prisma.club.deleteMany({ where: { title: { startsWith: "Test Club E2E " } } }),
      prisma.newsPost.deleteMany({ where: { id: { in: newsIds } } }),
    ]);
    const total = c.count + cl.count + n.count;
    if (total) console.log(`[teardown] purged ${total} e2e artifacts (carousel=${c.count}, clubs=${cl.count}, news=${n.count}).`);
  } catch (e) {
    console.warn("[teardown] e2e-artifact cleanup skipped:", (e as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}
