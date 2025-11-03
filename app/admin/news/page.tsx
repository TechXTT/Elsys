import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { loadNewsJson } from "@/lib/content";
import type { PostItem } from "@/lib/types";
import { NewsManager } from "./news-manager";

export default async function AdminNewsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const posts = loadNewsJson();

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
      <NewsManager initialPosts={posts as PostItem[]} />
    </div>
  );
}
