import { prisma } from "@/lib/prisma";
import OneTimeReveal from "@/components/OneTimeReveal";

export const dynamic = "force-dynamic";

async function getOneTimeStatus(token: string) {
  const now = new Date();
  const record = await (prisma as any).oneTimeSecret.findUnique({ where: { token } });
  if (!record) return { state: "missing" as const };
  if (record.usedAt) return { state: "used" as const };
  if (record.expiresAt <= now) return { state: "expired" as const };
  return { state: "ready" as const };
}

export default async function OneTimeSecretPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const status = await getOneTimeStatus(token);

  let label: string | null = null;
  if (status.state === "missing") label = "Link not found.";
  if (status.state === "used") label = "This link has already been used.";
  if (status.state === "expired") label = "This link has expired.";

  return (
    <main className="container mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">One-time link</h1>
      {label ? (
        <p className="mt-3 text-slate-600 dark:text-slate-300">{label}</p>
      ) : (
        <div className="mt-4">
          <p className="text-slate-600 dark:text-slate-300">Click the button below to reveal your temporary password. It will only be shown once.</p>
          <div className="mt-6">
            <OneTimeReveal token={token} />
          </div>
          <p className="mt-6 text-sm text-slate-500">If you lose it, ask an administrator to reset your password.</p>
        </div>
      )}
    </main>
  );
}
