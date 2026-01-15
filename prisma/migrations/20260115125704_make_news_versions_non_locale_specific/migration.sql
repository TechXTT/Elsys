-- AlterTable: Remove newsPostLocale column from NewsPostVersion
-- This makes version history shared across all locales of the same article

-- Drop existing indexes that reference newsPostLocale
DROP INDEX IF EXISTS "NewsPostVersion_newsPostId_newsPostLocale_version_idx";
DROP INDEX IF EXISTS "NewsPostVersion_newsPostId_newsPostLocale_createdAt_idx";

-- Remove the newsPostLocale column
ALTER TABLE "NewsPostVersion" DROP COLUMN IF EXISTS "newsPostLocale";

-- Create new indexes without locale
CREATE INDEX "NewsPostVersion_newsPostId_version_idx" ON "NewsPostVersion"("newsPostId", "version");
CREATE INDEX "NewsPostVersion_newsPostId_createdAt_idx" ON "NewsPostVersion"("newsPostId", "createdAt");
