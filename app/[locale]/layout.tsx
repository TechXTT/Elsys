import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";

import { AppShell } from "../AppShell";
import { locales, type Locale } from "@/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

async function loadMessages(locale: Locale) {
  return (await import(`../../messages/${locale}.json`)).default;
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: Locale };
}) {
  const locale = params.locale;
  if (!locales.includes(locale)) notFound();

  let messages: AbstractIntlMessages;
  try {
    messages = await loadMessages(locale);
  } catch (error) {
    console.error("Missing translation messages for locale", locale, error);
    notFound();
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Sofia">
      <AppShell>{children}</AppShell>
    </NextIntlClientProvider>
  );
}

