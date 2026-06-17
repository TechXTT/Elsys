-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "categoryPageId" TEXT;

-- CreateIndex
CREATE INDEX "NewsPost_categoryPageId_idx" ON "NewsPost"("categoryPageId");

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_categoryPageId_fkey" FOREIGN KEY ("categoryPageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
