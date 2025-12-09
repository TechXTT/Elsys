-- AlterEnum
ALTER TYPE "PageKind" ADD VALUE 'ROUTE';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "routeOverride" TEXT,
ADD COLUMN     "routePath" TEXT;

-- CreateIndex
CREATE INDEX "NewsPost_locale_published_date_idx" ON "NewsPost"("locale", "published", "date");

-- CreateIndex
CREATE INDEX "Page_locale_published_idx" ON "Page"("locale", "published");

-- CreateIndex
CREATE INDEX "Page_locale_parentId_slug_idx" ON "Page"("locale", "parentId", "slug");
