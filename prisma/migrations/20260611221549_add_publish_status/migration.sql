-- DropIndex
DROP INDEX "public"."NewsPost_locale_published_date_idx";

-- DropIndex
DROP INDEX "public"."Page_locale_published_idx";

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "status" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "status" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED';

-- Backfill (R3): the DEFAULT 'PUBLISHED' above already covers published=true rows;
-- map the remaining published=false rows to DRAFT. Boolean columns are kept and
-- dual-written during the transition, so this is non-destructive and reversible.
UPDATE "NewsPost" SET "status" = 'DRAFT' WHERE "published" = false;
UPDATE "Page"     SET "status" = 'DRAFT' WHERE "published" = false;

-- CreateIndex
CREATE INDEX "NewsPost_locale_status_date_idx" ON "NewsPost"("locale", "status", "date");

-- CreateIndex
CREATE INDEX "Page_locale_status_idx" ON "Page"("locale", "status");
