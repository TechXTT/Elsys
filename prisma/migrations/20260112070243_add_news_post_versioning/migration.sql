-- CreateTable
CREATE TABLE "NewsPostVersion" (
    "id" TEXT NOT NULL,
    "newsPostId" TEXT NOT NULL,
    "newsPostLocale" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "bodyMarkdown" TEXT NOT NULL,
    "blocks" JSONB,
    "useBlocks" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL,
    "images" JSONB,
    "featuredImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsPostVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsPostVersion_newsPostId_newsPostLocale_version_idx" ON "NewsPostVersion"("newsPostId", "newsPostLocale", "version");

-- CreateIndex
CREATE INDEX "NewsPostVersion_newsPostId_newsPostLocale_createdAt_idx" ON "NewsPostVersion"("newsPostId", "newsPostLocale", "createdAt");

-- AddForeignKey
ALTER TABLE "NewsPostVersion" ADD CONSTRAINT "NewsPostVersion_newsPostId_newsPostLocale_fkey" FOREIGN KEY ("newsPostId", "newsPostLocale") REFERENCES "NewsPost"("id", "locale") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPostVersion" ADD CONSTRAINT "NewsPostVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
