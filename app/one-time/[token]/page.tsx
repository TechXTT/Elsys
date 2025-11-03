import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function claimSecret(token: string) {
  const now = new Date();
  const record = await (prisma as any).oneTimeSecret.findUnique({ where: { token } });
  if (!record) return { ok: false as const, reason: "missing" as const };
  if (record.usedAt) return { ok: false as const, reason: "used" as const };
  if (record.expiresAt <= now) return { ok: false as const, reason: "expired" as const };
  const secret = record.secret || "";
  // Invalidate immediately so link becomes single-use
  await (prisma as any).oneTimeSecret.update({ where: { token }, data: { usedAt: now, secret: null } });
  return { ok: true as const, secret, type: record.type, userId: record.userId };
}

export default async function OneTimeSecretPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const result = await claimSecret(token);

  if (!result.ok) {
    const label = result.reason === "used" ? "This link has already been used." : result.reason === "expired" ? "This link has expired." : "Link not found.";
    return (
      <main className="container mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">One-time link</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">{label}</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Your temporary password</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Save it now. This page won’t show it again.</p>
      <div className="mt-5 rounded border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <code className="select-all break-all rounded bg-amber-100 px-2 py-1 text-sm dark:bg-amber-800">{result.secret}</code>
        </div>
      </div>
      <p className="mt-6 text-sm text-slate-500">If you lose it, ask an administrator to reset your password.</p>
    </main>
  );
}
