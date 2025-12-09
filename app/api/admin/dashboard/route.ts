import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all stats in parallel
    const [
      totalNews,
      publishedNews,
      draftNews,
      recentNews,
      totalPages,
      publishedPages,
      totalUsers,
      adminUsers,
      recentAuditLogs,
      newsLast30Days,
      pagesLast30Days,
    ] = await Promise.all([
      // News stats
      prisma.newsPost.count(),
      prisma.newsPost.count({ where: { published: true } }),
      prisma.newsPost.count({ where: { published: false } }),
      prisma.newsPost.findMany({
        take: 15, // Fetch more to account for locale duplicates
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          locale: true,
          title: true,
          published: true,
          updatedAt: true,
          author: { select: { name: true, email: true } },
        },
      }),

      // Page stats
      prisma.page.count(),
      prisma.page.count({ where: { published: true } }),

      // User stats
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),

      // Recent activity
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),

      // Trends
      prisma.newsPost.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.page.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Transform recent news for frontend - deduplicate by article ID (show only most recent locale version)
    const newsById = new Map<string, typeof recentNews[0]>();
    for (const post of recentNews) {
      const existing = newsById.get(post.id);
      // Keep the most recently updated version
      if (!existing || post.updatedAt > existing.updatedAt) {
        newsById.set(post.id, post);
      }
    }
    
    const recentNewsItems = Array.from(newsById.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map((post) => ({
        id: post.id,
        title: post.title,
        locale: post.locale,
        status: post.published ? "published" : "draft",
        updatedAt: post.updatedAt.toISOString(),
        author: post.author?.name || post.author?.email || null,
      }));

    // Transform audit logs for frontend
    const activityItems = recentAuditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      userName: log.user?.name,
      userEmail: log.user?.email,
      createdAt: log.createdAt.toISOString(),
      details: log.details,
    }));

    return NextResponse.json({
      stats: {
        news: {
          total: totalNews,
          published: publishedNews,
          draft: draftNews,
          last30Days: newsLast30Days,
        },
        pages: {
          total: totalPages,
          published: publishedPages,
          last30Days: pagesLast30Days,
        },
        users: {
          total: totalUsers,
          admins: adminUsers,
        },
      },
      recentNews: recentNewsItems,
      recentActivity: activityItems,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
