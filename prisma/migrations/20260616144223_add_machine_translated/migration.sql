-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "machineTranslated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "machineTranslated" BOOLEAN NOT NULL DEFAULT false;
