-- CreateEnum
CREATE TYPE "PageKind" AS ENUM ('PAGE', 'LINK', 'FOLDER');

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "accessRole" "Role",
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "kind" "PageKind" NOT NULL DEFAULT 'PAGE',
ADD COLUMN     "navLabel" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "visible" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Page_parentId_order_idx" ON "Page"("parentId", "order");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
