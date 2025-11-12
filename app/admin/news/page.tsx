import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { defaultLocale, type Locale } from "@/i18n/config";
import type { PostItem } from "@/lib/types";
import { getNewsPosts } from "@/lib/news";
import { NewsAdminShell } from "./NewsAdminShell";

export default async function AdminNewsPage({ searchParams }: { searchParams?: { locale?: Locale } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const selectedLocale = (searchParams?.locale === "bg" || searchParams?.locale === "en") ? (searchParams!.locale as Locale) : defaultLocale;
  const posts = await getNewsPosts(selectedLocale, true);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">News</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Create and edit posts for the "News" section. Provide title, slug, excerpt and Markdown content; optionally upload multiple images,
          choose their display size, mark a featured (card) image and reference their filenames in Markdown using <code>![alt](file-name)</code>.
          The live preview updates in real time.
        </p>
      </header>
      <NewsAdminShell initialPosts={posts as PostItem[]} initialLocale={selectedLocale} />
    </div>
  );
}
