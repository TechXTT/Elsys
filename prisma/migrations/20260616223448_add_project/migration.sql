-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'bg',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
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

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_locale_status_order_idx" ON "Project"("locale", "status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_locale_key" ON "Project"("slug", "locale");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
