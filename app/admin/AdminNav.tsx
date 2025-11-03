"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
// Admin console is English-only and decoupled from site i18n

type NavLink = { href: string; label: string; adminOnly?: boolean };
const baseLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";
  const { data } = useSession();
  const isAdmin = (data?.user as any)?.role === "ADMIN";
  const adminLinks = baseLinks.filter((l) => !l.adminOnly || isAdmin);

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/admin" className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Admin Console</Link>
        <div className="flex flex-1 items-center justify-end gap-4 text-sm">
          <Link href="/" className="cursor-pointer rounded border border-slate-300 px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            ← Back to site
          </Link>
          <div className="flex items-center gap-2">
            {adminLinks.map(({ href, label }) => {
              const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
              return (
                <Link
                  key={href}
                  href={{ pathname: href }}
                  className={`cursor-pointer rounded px-3 py-1 font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
          <form action="/api/auth/signout" method="post">
            <button className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
