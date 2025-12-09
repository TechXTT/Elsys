import { getServerSession } from "next-auth";
import { AdminSidebar } from "./components/AdminSidebar";
import { authOptions } from "@/lib/auth";
import AdminProviders from "./providers";

export const metadata = {
  title: "TUES Admin",
  description: "Content management dashboard for TUES website",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  // If not logged in, don't show sidebar (login page handles itself)
  if (!session) {
    return (
      <AdminProviders session={session}>
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
          {children}
        </div>
      </AdminProviders>
    );
  }

  return (
    <AdminProviders session={session}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AdminSidebar />
        {/* Main content area - offset by sidebar width on desktop */}
        <main className="min-h-screen pt-14 lg:ml-64 lg:pt-0">
          <div className="mx-auto max-w-6xl p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </AdminProviders>
  );
}
