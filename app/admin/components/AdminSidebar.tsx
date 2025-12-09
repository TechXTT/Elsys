"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  Users,
  Settings,
  ClipboardList,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { AdminLocaleSwitcher } from "./AdminLocaleSwitcher";

type NavLinkKey = "dashboard" | "news" | "pages" | "users" | "audit" | "settings";

type NavLink = {
  href: string;
  labelKey: NavLinkKey;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const navLinks: NavLink[] = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/admin/news", labelKey: "news", icon: Newspaper },
  { href: "/admin/navigation", labelKey: "pages", icon: FileText, adminOnly: true },
  { href: "/admin/users", labelKey: "users", icon: Users, adminOnly: true },
  { href: "/admin/audit", labelKey: "audit", icon: ClipboardList, adminOnly: true },
  { href: "/admin/settings", labelKey: "settings", icon: Settings },
];

// TUES Logo component
function TuesLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" className="fill-brand-600" />
      <path
        d="M8 14h24v3H22v15h-4V17H8v-3z"
        className="fill-white"
      />
    </svg>
  );
}

export function AdminSidebar() {
  const t = useTranslations("Admin");
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const links = navLinks.filter((l) => !l.adminOnly || isAdmin);
  const [showSignOut, setShowSignOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "Admin";
  const userEmail = session?.user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-4 py-3 lg:hidden dark:border-slate-800/80 dark:bg-slate-950/80">
        <Link href="/admin" className="flex items-center gap-2.5">
          <TuesLogo className="h-7 w-7" />
          <span className="font-bold text-slate-900 dark:text-white">TUES Admin</span>
        </Link>
        <div className="flex items-center gap-2">
          <AdminLocaleSwitcher />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col bg-slate-950 transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:top-0`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/admin" className="flex items-center gap-3">
            <TuesLogo className="h-9 w-9" />
            <div>
              <span className="font-bold text-white">TUES</span>
              <span className="ml-1 text-sm text-slate-400">Admin</span>
            </div>
          </Link>
          <AdminLocaleSwitcher />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {links.map(({ href, labelKey, icon: Icon, adminOnly }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
              return (
                <li key={href}>
                  <Link
                    href={href as any}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25"
                        : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-500 group-hover:text-brand-400"}`} />
                    {t(`nav.${labelKey}`)}
                    {adminOnly && (
                      <span className="ml-auto rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                        {t("badge.admin")}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="my-5 border-t border-slate-800" />

          {/* External links */}
          <ul className="space-y-1">
            <li>
              <Link
                href="/"
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800/80 hover:text-white"
              >
                <ExternalLink className="h-5 w-5 text-slate-500 group-hover:text-brand-400" />
                {t("nav.viewSite")}
              </Link>
            </li>
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white shadow-lg shadow-brand-600/25">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {userName}
              </p>
              <p className="truncate text-xs text-slate-500">
                {userEmail}
              </p>
            </div>
            <button
              onClick={() => setShowSignOut(true)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
              title={t("nav.signOut")}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Sign out modal */}
      {showSignOut && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
          onClick={() => setShowSignOut(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">{t("signOutModal.title")}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {t("signOutModal.message")}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowSignOut(false)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
              >
                {t("signOutModal.cancel")}
              </button>
              <button
                onClick={() => {
                  setShowSignOut(false);
                  void signOut({ callbackUrl: "/admin/login" });
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                {t("signOutModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
