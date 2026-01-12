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
    <div className="-mx-4 -my-4 flex h-[calc(100vh-2rem)] flex-col lg:-mx-8 lg:-my-8 lg:h-[calc(100vh-4rem)]">
      <header className="flex-shrink-0 space-y-1 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 lg:px-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">News</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Create and edit posts for the "News" section. Provide title, slug, excerpt and Markdown content; optionally upload multiple images,
          choose their display size, mark a featured (card) image and reference their filenames in Markdown using <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">![alt](file-name)</code>.
          The live preview updates in real time.
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <NewsAdminShell initialPosts={posts as PostItem[]} initialLocale={selectedLocale} />
      </div>
    </div>
  );
}
