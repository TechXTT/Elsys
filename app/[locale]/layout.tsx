import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";

import { locales, type Locale } from "@/i18n/config";
import { getNavigationTree } from "@/lib/navigation-build";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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

  const navigation = await getNavigationTree(locale);
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Sofia">
      <SiteHeader initialNav={navigation.items} />
      {children}
      <SiteFooter />
    </NextIntlClientProvider>
  );
}

