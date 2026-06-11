-- CreateEnum
CREATE TYPE "ColorTag" AS ENUM ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'TEAL', 'BLUE', 'INDIGO', 'PURPLE', 'PINK', 'GRAY');

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'bg',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "body" JSONB,
    "color" "ColorTag" NOT NULL DEFAULT 'BLUE',
    "coverImage" TEXT,
    "gallery" JSONB,
    "meetingSchedule" TEXT,
    "contactEmail" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3),
    "unpublishAt" TIMESTAMP(3),
    "legacyId" INTEGER,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Club_locale_status_order_idx" ON "Club"("locale", "status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_locale_key" ON "Club"("slug", "locale");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
