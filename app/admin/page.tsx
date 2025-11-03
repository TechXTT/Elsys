import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Администрация</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/news" className="rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
          Управление на новини
        </Link>
        <Link href={"/admin/pages" as any} className="rounded border p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
          Статични страници (скоро)
        </Link>
      </div>
    </div>
  );
}
