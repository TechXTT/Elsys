"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

const adminLinks = [
  { href: "/admin", label: "Табло" },
  { href: "/admin/news", label: "Новини" },
  { href: "/admin/pages", label: "Страници" },
  { href: "/admin/admins", label: "Администратори" },
] as const;

export function AdminNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/admin" className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          Admin Console
        </Link>
        <div className="flex flex-1 items-center justify-end gap-4 text-sm">
          <Link
            href={`/${defaultLocale}`}
            className="cursor-pointer rounded border border-slate-300 px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ← Към сайта
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
              Изход
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
