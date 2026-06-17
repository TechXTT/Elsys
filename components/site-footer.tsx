"use client";

import React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { cn } from "@/lib/cn";

// Curated footer columns. hrefs are the intended canonical routes; some target
// pages land in Phase E (flagged in the Phase-C report).
const COLUMNS: { title: string; links: { key: string; href: string }[] }[] = [
  {
    title: "colEducation",
    links: [
      { key: "specialties", href: "/obuchenie" },
      { key: "admissions", href: "/priem" },
      { key: "schedules", href: "/grafik" },
      { key: "documents", href: "/dokumenti" },
    ],
  },
  {
    title: "colAbout",
    links: [
      { key: "history", href: "/za-nas" },
      { key: "team", href: "/ekip" },
      { key: "partners", href: "/partnyori" },
      { key: "contacts", href: "/kontakti" },
    ],
  },
  {
    title: "colCommunity",
    links: [
      { key: "news", href: "/novini" },
      { key: "clubs", href: "/klubove" },
      { key: "olympiads", href: "/olimpiadi" },
      { key: "alumni", href: "/vazpitanitsi" },
    ],
  },
];

const POLICIES: { key: string; href: string }[] = [
  { key: "privacy", href: "/poveritelnost" },
  { key: "cookies", href: "/biskvitki" },
  { key: "accessibility", href: "/dostapnost" },
];

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();
  const linkCls = "text-body-sm text-[var(--color-text-on-brand)] opacity-90 hover:underline hover:opacity-100";

  return (
    <footer className="bg-[var(--color-bg-footer)] text-[var(--color-text-on-brand)]">
      <div className="container-page grid gap-[var(--spacing-2xl)] py-[var(--spacing-3xl)] md:grid-cols-4">
        <div className="flex flex-col gap-[var(--spacing-sm)]">
          <span className="text-h4 font-semibold">{t("brand")}</span>
          <p className="text-body-sm opacity-80">
            {t("description")}
            <br />
            {t("address")}
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={t(col.title)} className="flex flex-col gap-[var(--spacing-sm)]">
            <h2 className="text-overline opacity-80">{t(col.title)}</h2>
            <ul className="flex flex-col gap-[var(--spacing-xs)]">
              {col.links.map((link) => (
                <li key={link.key}>
                  <Link data-ui="footer" href={link.href} className={linkCls}>
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/20">
        <div className="container-page flex flex-col gap-[var(--spacing-sm)] py-[var(--spacing-md)] text-body-sm opacity-80 md:flex-row md:items-center md:justify-between">
          <span>{t("rightsReserved", { year })}</span>
          <div className="flex flex-wrap gap-[var(--spacing-lg)]">
            {POLICIES.map((policy) => (
              <Link key={policy.key} data-ui="footer" href={policy.href} className={cn(linkCls)}>
                {t(policy.key)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
