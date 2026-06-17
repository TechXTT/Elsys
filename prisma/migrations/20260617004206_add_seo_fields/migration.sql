-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "canonical" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "noindex" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ogImage" TEXT;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "canonical" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "noindex" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ogImage" TEXT;
