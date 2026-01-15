import { prisma } from "./prisma";
import { defaultLocale, type Locale } from "@/i18n/config";

interface NewsPostVersionRow {
  id: string;
  newsPostId: string;
  version: number;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string;
  blocks: unknown[] | null;
  useBlocks: boolean;
  date: Date;
  images: unknown[] | null;
  featuredImage: string | null;
  published: boolean;
  createdById: string | null;
  createdAt: Date;
  createdBy?: {
    name: string | null;
    email: string | null;
  } | null;
}

/**
 * Get all version history for a news post (shared across all locales)
 */
export async function getNewsPostVersions(
  slug: string
): Promise<NewsPostVersionRow[]> {
  const versions: NewsPostVersionRow[] = await (prisma as any).newsPostVersion.findMany({
    where: {
      newsPostId: slug,
    },
    orderBy: { version: "desc" },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  return versions;
}

/**
 * Get a specific version of a news post
 */
export async function getNewsPostVersion(
  slug: string,
  versionNumber: number
): Promise<NewsPostVersionRow | null> {
  const version: NewsPostVersionRow | null = await (prisma as any).newsPostVersion.findFirst({
    where: {
      newsPostId: slug,
      version: versionNumber,
    },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
  return version;
}

/**
 * Restore a news post to a specific version
 * Applies the restored content to the specified locale
 */
export async function restoreNewsPostVersion(args: {
  slug: string;
  versionNumber: number;
  locale?: Locale;
  userId: string;
}): Promise<{ success: boolean; error?: string; newVersion?: number }> {
  const localeValue = args.locale ?? defaultLocale;

  // Get the version to restore
  const versionToRestore = await getNewsPostVersion(args.slug, args.versionNumber);
  if (!versionToRestore) {
    return { success: false, error: "Version not found" };
  }

  try {
    // Get current version count to create new version number
    const versionCount = await (prisma as any).newsPostVersion.count({
      where: {
        newsPostId: args.slug,
      },
    });
    const nextVersion = versionCount + 1;

    // Create new version with restored content
    await (prisma as any).newsPostVersion.create({
      data: {
        newsPostId: args.slug,
        version: nextVersion,
        title: versionToRestore.title,
        excerpt: versionToRestore.excerpt,
        bodyMarkdown: versionToRestore.bodyMarkdown,
        blocks: versionToRestore.blocks,
        useBlocks: versionToRestore.useBlocks,
        date: versionToRestore.date,
        images: versionToRestore.images,
        featuredImage: versionToRestore.featuredImage,
        published: versionToRestore.published,
        createdById: args.userId,
      },
    });

    // Update the actual post in the specified locale
    await (prisma as any).newsPost.update({
      where: {
        id_locale: {
          id: args.slug,
          locale: localeValue,
        },
      },
      data: {
        title: versionToRestore.title,
        excerpt: versionToRestore.excerpt,
        bodyMarkdown: versionToRestore.bodyMarkdown,
        blocks: versionToRestore.blocks,
        useBlocks: versionToRestore.useBlocks,
        date: versionToRestore.date,
        images: versionToRestore.images,
        featuredImage: versionToRestore.featuredImage,
        published: versionToRestore.published,
      },
    });

    return { success: true, newVersion: nextVersion };
  } catch (error) {
    console.error("Error restoring news post version", error);
    return { success: false, error: "Failed to restore version" };
  }
}

/**
 * Delete old versions (keep only recent N versions)
 * Useful for cleanup/maintenance
 */
export async function pruneNewsPostVersions(args: {
  slug: string;
  keepCount: number;
}): Promise<{ deletedCount: number }> {
  const allVersions = await (prisma as any).newsPostVersion.findMany({
    where: {
      newsPostId: args.slug,
    },
    orderBy: { version: "desc" },
    select: { id: true },
  });

  if (allVersions.length <= args.keepCount) {
    return { deletedCount: 0 };
  }

  const toDelete = allVersions.slice(args.keepCount);
  const result = await (prisma as any).newsPostVersion.deleteMany({
    where: {
      id: { in: toDelete.map((v: any) => v.id) },
    },
  });

  return { deletedCount: result.count };
}
