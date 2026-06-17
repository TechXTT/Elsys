"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Newspaper,
  FileText,
  Users,
  PlusCircle,
  Activity,
  Clock,
  RefreshCw,
  TrendingUp,
  Zap,
  Settings,
  ChevronRight,
  Eye,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { formatDistanceToNow } from "./utils/date";

interface DashboardStats {
  stats: {
    news: { total: number; published: number; draft: number; last30Days: number };
    pages: { total: number; published: number; last30Days: number };
    users: { total: number; admins: number };
  };
  recentNews: Array<{
    id: string;
    title: string;
    locale: string;
    status: "published" | "draft";
    updatedAt: string;
    author: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string | null;
    entityId: string | null;
    userName: string | null;
    userEmail: string | null;
    createdAt: string;
    details: Record<string, any> | null;
  }>;
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  color = "brand",
}: {
  icon: any;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: { value: number; label: string };
  color?: "brand" | "emerald" | "amber" | "slate";
}) {
  const iconColors: Record<string, string> = {
    brand: "bg-[var(--color-action-primary)] text-[var(--color-text-on-action)]",
    emerald: "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]",
    amber: "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)]",
    slate: "bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]",
  };

  return (
    <div className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[var(--spacing-lg)] transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] ${iconColors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <div className="text-caption flex items-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-status-success-bg)] px-2 py-1 font-medium text-[var(--color-status-success-text)]">
            <TrendingUp className="h-3 w-3" />
            +{trend.value}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-h2 text-[var(--color-text-heading)]">{value}</p>
        <p className="text-body-sm mt-1 font-medium text-[var(--color-text-muted)]">{label}</p>
        {subtext && (
          <p className="text-caption mt-0.5 text-[var(--color-text-muted)]">{subtext}</p>
        )}
      </div>
    </div>
  );
}

// Quick action card
function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href as any}
      className="group flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 transition-all hover:bg-[var(--color-bg-subtle)]"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-brand-tint)] text-[var(--color-text-link)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--color-text-heading)]">{title}</p>
        <p className="text-body-sm text-[var(--color-text-muted)]">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

// News row item
function NewsRow({
  title,
  status,
  author,
  updatedAt,
  id,
}: {
  title: string;
  status: "published" | "draft";
  author: string | null;
  updatedAt: string;
  id: string;
}) {
  return (
    <Link
      href={`/admin/news?edit=${id}` as any}
      className="group flex items-center gap-4 border-b border-line px-5 py-4 transition-colors last:border-0 hover:bg-subtle"
    >
      <div
        className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
          status === "published" ? "bg-[var(--color-tag-green)]" : "bg-[var(--color-tag-amber)]"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink-heading truncate group-hover:text-ink-link">
          {title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
          {author && <span>{author}</span>}
          {author && <span className="text-ink-muted">•</span>}
          <span data-ui="volatile-time">{formatDistanceToNow(new Date(updatedAt))}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-ink-muted transition-transform group-hover:translate-x-1 group-hover:text-ink-link" />
    </Link>
  );
}

// Activity item
function ActivityRow({
  action,
  entity,
  user,
  time,
}: {
  action: string;
  entity: string | null;
  user: string;
  time: Date;
}) {
  const getActionColor = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("create") || lower.includes("add")) return "bg-[var(--color-tag-green)]";
    if (lower.includes("update") || lower.includes("edit")) return "bg-[var(--color-tag-blue)]";
    if (lower.includes("delete")) return "bg-[var(--color-status-danger-text)]";
    return "bg-[var(--color-text-muted)]";
  };

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${getActionColor(action)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink">
          <span className="font-medium text-ink-heading">{action}</span>
          {entity && <span className="text-ink-muted"> → {entity}</span>}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {user} • <span data-ui="volatile-time">{formatDistanceToNow(time)}</span>
        </p>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const t = useTranslations("Admin");
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "there";

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greeting.morning");
    if (hour < 18) return t("greeting.afternoon");
    return t("greeting.evening");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* muted text → use the generated token, not a raw slate literal (M4.4 token sweep) */}
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            <Calendar className="mr-1.5 inline-block h-4 w-4" />
            <span data-ui="volatile-time">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
          <h1 className="text-h2 mt-1 text-[var(--color-text-heading)]">
            {greeting()}, {userName}
          </h1>
          <p className="mt-1 text-[var(--color-text-muted)]">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          data-ui="admin-button"
          className="text-body-sm inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-action-primary)] px-[var(--spacing-md)] py-2.5 font-medium text-[var(--color-text-on-action)] transition-colors hover:bg-[var(--color-action-primary-hover)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Newspaper}
          label={t("stats.totalNews")}
          value={data?.stats.news.total ?? "—"}
          subtext={t("stats.published", { count: data?.stats.news.published ?? 0 })}
          trend={data?.stats.news.last30Days ? { value: data.stats.news.last30Days, label: t("stats.last30Days") } : undefined}
          color="brand"
        />
        <StatCard
          icon={FileText}
          label={t("stats.totalPages")}
          value={data?.stats.pages.total ?? "—"}
          subtext={t("stats.published", { count: data?.stats.pages.published ?? 0 })}
          color="slate"
        />
        <StatCard
          icon={Users}
          label={t("stats.registeredUsers")}
          value={data?.stats.users.total ?? "—"}
          subtext={t("stats.admins", { count: data?.stats.users.admins ?? 0 })}
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label={t("stats.draftContent")}
          value={data?.stats.news.draft ?? "—"}
          subtext={t("stats.awaitingPublish")}
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-brand-600" />
          <h2 className="text-h4 font-semibold text-[var(--color-text-heading)]">
            {t("quickActions.title")}
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            href="/admin/news"
            icon={PlusCircle}
            title={t("quickActions.newPost")}
            description={t("quickActions.newPostDesc")}
          />
          <QuickActionCard
            href="/admin/navigation"
            icon={FileText}
            title={t("quickActions.managePages")}
            description={t("quickActions.managePagesDesc")}
          />
          {isAdmin && (
            <QuickActionCard
              href="/admin/users"
              icon={Users}
              title={t("quickActions.manageUsers")}
              description={t("quickActions.manageUsersDesc")}
            />
          )}
          <QuickActionCard
            href="/admin/settings"
            icon={Settings}
            title={t("quickActions.settings")}
            description={t("quickActions.settingsDesc")}
          />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent News - wider */}
        <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-brand-600" />
                <h3 className="text-h4 font-semibold text-[var(--color-text-heading)]">{t("recentNews.title")}</h3>
              </div>
              <Link
                href="/admin/news"
                className="text-body-sm flex items-center gap-1 font-medium text-[var(--color-text-link)] transition-colors hover:underline"
              >
                {t("recentNews.viewAll")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-ink-muted" />
              </div>
            ) : data?.recentNews && data.recentNews.length > 0 ? (
              <div>
                {data.recentNews.slice(0, 6).map((item) => (
                  <NewsRow
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    status={item.status}
                    author={item.author}
                    updatedAt={item.updatedAt}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-ink-muted">
                <Newspaper className="h-10 w-10 mb-2 opacity-40" />
                <span>{t("recentNews.empty")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Activity */}
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-600" />
                <h3 className="text-h4 font-semibold text-[var(--color-text-heading)]">{t("recentActivity.title")}</h3>
              </div>
              {isAdmin && (
                <Link
                  href="/admin/audit"
                  className="text-body-sm flex items-center gap-1 font-medium text-[var(--color-text-link)] transition-colors hover:underline"
                >
                  {t("recentActivity.viewAll")}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-5 w-5 animate-spin text-ink-muted" />
              </div>
            ) : data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="max-h-[300px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {data.recentActivity.slice(0, 8).map((activity) => (
                  <ActivityRow
                    key={activity.id}
                    action={activity.action}
                    entity={activity.entity}
                    user={activity.userName || activity.userEmail || "System"}
                    time={new Date(activity.createdAt)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-ink-muted">
                <Activity className="h-8 w-8 mb-2 opacity-40" />
                <span className="text-sm">{t("recentActivity.empty")}</span>
              </div>
            )}
          </div>

          {/* Notes for successors — generational-turnover constraint (keep). */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-brand-tint)] p-[var(--spacing-lg)]">
            <h3 className="text-h4 text-[var(--color-text-heading)]">{t("successorNotes.title")}</h3>
            <p className="text-body-sm mt-[var(--spacing-xs)] text-[var(--color-text-body)]">{t("successorNotes.body")}</p>
            <ul className="text-body-sm mt-[var(--spacing-sm)] flex list-disc flex-col gap-[var(--spacing-2xs)] pl-[var(--spacing-md)] text-[var(--color-text-body)]">
              <li>{t("successorNotes.tip1")}</li>
              <li>{t("successorNotes.tip2")}</li>
              <li>{t("successorNotes.tip3")}</li>
            </ul>
            <p className="text-caption mt-[var(--spacing-sm)] text-[var(--color-text-muted)]">{t("successorNotes.persistNote")}</p>
          </div>

          {/* System Status */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[var(--spacing-lg)]">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-tag-green)] animate-pulse" />
              <h3 className="text-h4 font-semibold text-[var(--color-text-heading)]">{t("systemStatus.title")}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] px-4 py-3">
                <div>
                  <p className="text-body-sm font-medium text-[var(--color-text-heading)]">{t("systemStatus.frontend")}</p>
                  <p className="text-caption text-[var(--color-text-muted)]">{t("systemStatus.frontendDesc")}</p>
                </div>
                <span className="text-caption rounded-[var(--radius-full)] bg-[var(--color-status-success-bg)] px-2.5 py-1 font-medium text-[var(--color-status-success-text)]">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] px-4 py-3">
                <div>
                  <p className="text-body-sm font-medium text-[var(--color-text-heading)]">{t("systemStatus.database")}</p>
                  <p className="text-caption text-[var(--color-text-muted)]">{t("systemStatus.databaseDesc")}</p>
                </div>
                <span className="text-caption rounded-[var(--radius-full)] bg-[var(--color-status-success-bg)] px-2.5 py-1 font-medium text-[var(--color-status-success-text)]">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
