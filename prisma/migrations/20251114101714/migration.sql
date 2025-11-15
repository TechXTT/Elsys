-- AlterTable
ALTER TABLE "Page" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Page_groupId_idx" ON "Page"("groupId");
