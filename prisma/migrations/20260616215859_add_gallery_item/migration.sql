-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'bg',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT,
    "album" TEXT,
    "color" "ColorTag" NOT NULL DEFAULT 'BLUE',
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3),
    "legacyId" INTEGER,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryItem_locale_status_order_idx" ON "GalleryItem"("locale", "status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "GalleryItem_slug_locale_key" ON "GalleryItem"("slug", "locale");

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
