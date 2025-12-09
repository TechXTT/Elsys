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
  const colors = {
    brand: "from-brand-600 to-brand-400 shadow-brand-600/20",
    emerald: "from-emerald-600 to-emerald-400 shadow-emerald-600/20",
    amber: "from-amber-500 to-amber-400 shadow-amber-500/20",
    slate: "from-slate-600 to-slate-400 shadow-slate-600/20",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            +{trend.value}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {subtext && (
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{subtext}</p>
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
      className="group flex items-center gap-4 rounded-xl bg-white p-4 ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 hover:ring-brand-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800/80 dark:hover:ring-brand-600"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100 dark:bg-brand-950/50 dark:text-brand-400 dark:group-hover:bg-brand-900/50">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white">{title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-slate-400 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
      className="group flex items-center gap-4 border-b border-slate-100 px-5 py-4 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
    >
      <div
        className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
          status === "published" ? "bg-emerald-500" : "bg-amber-400"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
          {title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          {author && <span>{author}</span>}
          {author && <span className="text-slate-300 dark:text-slate-600">•</span>}
          <span>{formatDistanceToNow(new Date(updatedAt))}</span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500 dark:text-slate-600" />
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
    if (lower.includes("create") || lower.includes("add")) return "bg-emerald-500";
    if (lower.includes("update") || lower.includes("edit")) return "bg-brand-500";
    if (lower.includes("delete")) return "bg-red-500";
    return "bg-slate-400";
  };

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${getActionColor(action)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-900 dark:text-white">{action}</span>
          {entity && <span className="text-slate-500"> → {entity}</span>}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {user} • {formatDistanceToNow(time)}
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
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            <Calendar className="mr-1.5 inline-block h-4 w-4" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            {greeting()}, {userName}
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500 disabled:opacity-50"
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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
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
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold text-slate-900 dark:text-white">{t("recentNews.title")}</h3>
              </div>
              <Link
                href="/admin/news"
                className="flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-400"
              >
                {t("recentNews.viewAll")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
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
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Newspaper className="h-10 w-10 mb-2 opacity-40" />
                <span>{t("recentNews.empty")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Activity */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold text-slate-900 dark:text-white">{t("recentActivity.title")}</h3>
              </div>
              {isAdmin && (
                <Link
                  href="/admin/audit"
                  className="flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-400"
                >
                  {t("recentActivity.viewAll")}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
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
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Activity className="h-8 w-8 mb-2 opacity-40" />
                <span className="text-sm">{t("recentActivity.empty")}</span>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-semibold text-slate-900 dark:text-white">{t("systemStatus.title")}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("systemStatus.frontend")}</p>
                  <p className="text-xs text-slate-500">{t("systemStatus.frontendDesc")}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("systemStatus.database")}</p>
                  <p className="text-xs text-slate-500">{t("systemStatus.databaseDesc")}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
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
