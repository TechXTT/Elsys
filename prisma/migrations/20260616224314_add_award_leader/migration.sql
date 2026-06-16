-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'bg',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "year" INTEGER NOT NULL,
    "category" TEXT,
    "color" "ColorTag" NOT NULL DEFAULT 'BLUE',
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3),
    "legacyId" INTEGER,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leader" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'bg',
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "description" TEXT,
    "image" TEXT,
    "year" INTEGER NOT NULL,
    "color" "ColorTag" NOT NULL DEFAULT 'BLUE',
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishAt" TIMESTAMP(3),
    "legacyId" INTEGER,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leader_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Award_locale_status_year_idx" ON "Award"("locale", "status", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Award_slug_locale_key" ON "Award"("slug", "locale");

-- CreateIndex
CREATE INDEX "Leader_locale_status_year_idx" ON "Leader"("locale", "status", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Leader_slug_locale_key" ON "Leader"("slug", "locale");

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leader" ADD CONSTRAINT "Leader_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
