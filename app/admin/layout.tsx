import { getServerSession } from "next-auth";
import { AdminNav } from "./AdminNav";
import { authOptions } from "@/lib/auth";
import AdminProviders from "./providers";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <AdminProviders session={session}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {session ? <AdminNav /> : null}
        <main className="container mx-auto max-w-5xl px-4 py-8">{children}</main>
      </div>
    </AdminProviders>
  );
}
