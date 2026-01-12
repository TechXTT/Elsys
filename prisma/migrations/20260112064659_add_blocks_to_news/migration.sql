-- AlterTable
ALTER TABLE "NewsPost" ADD COLUMN     "blocks" JSONB,
ADD COLUMN     "useBlocks" BOOLEAN NOT NULL DEFAULT false;
