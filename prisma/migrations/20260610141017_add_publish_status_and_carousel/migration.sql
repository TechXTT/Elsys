-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PREVIEW', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Carousel" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'bg',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageDesktop" TEXT NOT NULL,
    "imageTablet" TEXT,
    "imagePhone" TEXT,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'PUBLISHED',
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3),
    "unpublishAt" TIMESTAMP(3),
    "legacyId" INTEGER,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carousel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Carousel_locale_status_order_idx" ON "Carousel"("locale", "status", "order");

-- AddForeignKey
ALTER TABLE "Carousel" ADD CONSTRAINT "Carousel_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
