"use client";

import React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";

export const SiteFooter: React.FC = () => {
  const t = useTranslations("Footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="container-page grid gap-8 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
            <img src="/images/logo.svg" alt="TUES" className="h-8 w-8" />
            {t("title")}
          </div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{t("description")}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("linksTitle")}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link className="text-slate-600 hover:underline dark:text-slate-400" href="/novini">
                {t("news")}
              </Link>
            </li>
            <li>
              <Link className="text-slate-600 hover:underline dark:text-slate-400" href="/priem">
                {t("admissions")}
              </Link>
            </li>
            <li>
              <Link className="text-slate-600 hover:underline dark:text-slate-400" href="/uchilishteto">
                {t("school")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("contactsTitle")}</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t("address")}
            <br />
            <a className="hover:underline" href="mailto:tues@elsys-bg.org">
              {t("email")}
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-700">
        <div className="container-page py-4 text-xs text-slate-500 dark:text-slate-400">
          {t("copyright", { year: currentYear })}
        </div>
      </div>
    </footer>
  );
};


