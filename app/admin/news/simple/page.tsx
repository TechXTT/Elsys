import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { defaultLocale, type Locale } from "@/i18n/config";
import { getNewsCategoryPages } from "@/lib/news";
import { SimpleEditor } from "./SimpleEditor";

export const dynamic = "force-dynamic";

export default async function NewSimpleNewsPage({ searchParams }: { searchParams?: { locale?: Locale } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const locale = (searchParams?.locale === "en" ? "en" : defaultLocale) as Locale;
  const categoryPages = await getNewsCategoryPages(locale);

  return <SimpleEditor locale={locale} categoryPages={categoryPages} />;
}
