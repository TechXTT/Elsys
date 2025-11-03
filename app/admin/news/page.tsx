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
        <h1 className="text-2xl font-semibold">Новини</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Създавайте и редактирайте публикации за секция "Новини". Попълнете заглавие, слаг, кратко описание и Markdown съдържание; по избор качете множество
          изображения, изберете техния размер, маркирайте основното (превю) изображение и посочвайте имената им в Markdown чрез синтаксис <code>![alt](име-на-файл)</code>.
          Вградената визуализация показва резултата в реално време.
        </p>
      </header>
      <NewsManager initialPosts={posts as PostItem[]} />
    </div>
  );
}
