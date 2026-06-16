-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'bg',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" TEXT,
    "category" TEXT,
    "color" "ColorTag" NOT NULL DEFAULT 'BLUE',
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3),
    "legacyId" INTEGER,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_locale_status_order_idx" ON "Document"("locale", "status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Document_slug_locale_key" ON "Document"("slug", "locale");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
