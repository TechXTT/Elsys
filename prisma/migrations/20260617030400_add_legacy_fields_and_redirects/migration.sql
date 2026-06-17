-- AlterTable
ALTER TABLE "Award" ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "Carousel" ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "GalleryItem" ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "Leader" ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "legacyId" INTEGER,
ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "legacyId" INTEGER,
ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "legacyUrl" TEXT;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "legacyUrl" TEXT;

-- CreateTable
CREATE TABLE "RouteRedirect" (
    "id" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 308,
    "legacyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RouteRedirect_fromPath_key" ON "RouteRedirect"("fromPath");

-- CreateIndex
CREATE INDEX "RouteRedirect_fromPath_idx" ON "RouteRedirect"("fromPath");
