-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'bg',
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "url" TEXT,
    "category" TEXT,
    "color" "ColorTag" NOT NULL DEFAULT 'BLUE',
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3),
    "legacyId" INTEGER,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Partner_locale_status_order_idx" ON "Partner"("locale", "status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_slug_locale_key" ON "Partner"("slug", "locale");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
