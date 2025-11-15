-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "currentVersionId" TEXT;

-- CreateTable
CREATE TABLE "PageVersion" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "bodyMarkdown" TEXT,
    "blocks" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NavigationItem" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT,
    "externalUrl" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "accessRole" "Role",
    "labels" JSONB NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageVersion_pageId_version_idx" ON "PageVersion"("pageId", "version");

-- CreateIndex
CREATE INDEX "NavigationItem_parentId_order_idx" ON "NavigationItem"("parentId", "order");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "PageVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageVersion" ADD CONSTRAINT "PageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageVersion" ADD CONSTRAINT "PageVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NavigationItem" ADD CONSTRAINT "NavigationItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NavigationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
