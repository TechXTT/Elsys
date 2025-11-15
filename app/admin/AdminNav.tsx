"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
// Admin console is English-only and decoupled from site i18n

type NavLink = { href: string; label: string; adminOnly?: boolean };
const baseLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/news", label: "News" },
  // Pages editing is managed through Navigation UI; expose it as "Pages"
  { href: "/admin/navigation", label: "Pages" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/users", label: "Users", adminOnly: true },
  { href: "/admin/audit", label: "Audit", adminOnly: true },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";
  const { data } = useSession();
  const isAdmin = (data?.user as any)?.role === "ADMIN";
  const adminLinks = baseLinks.filter((l) => !l.adminOnly || isAdmin);
  const [showSignOut, setShowSignOut] = useState(false);

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
          <button
            onClick={() => setShowSignOut(true)}
            className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
      {showSignOut && (
        <div
          className="fixed left-0 top-0 w-screen h-screen z-50 flex items-center justify-center bg-black/40 p-4"
          aria-modal="true"
          role="dialog"
        >
          <div className="w-full max-w-sm transform rounded-md border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sign out</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Are you sure you want to sign out?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
          onClick={() => setShowSignOut(false)}
          className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
          Cancel
              </button>
              <button
          onClick={() => {
            setShowSignOut(false);
            // Use NextAuth signOut to terminate the session and redirect
            void signOut({ callbackUrl: "/admin/login" });
          }}
          className="rounded border border-red-300 bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 dark:border-red-700"
              >
          Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
