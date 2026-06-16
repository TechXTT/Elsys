import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTotpConfigured } from "@/lib/totp";
import { SecurityClient } from "./SecurityClient";

export default async function SecurityPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  const id = (session.user as any).id as string;
  const user = await prisma.user.findUnique({ where: { id }, select: { twoFactorEnabled: true } as any });
  const t = await getTranslations("Admin.security");

  return (
    <div className="space-y-[var(--spacing-lg)]">
      <header>
        <h1 className="text-h2 text-[var(--color-text-heading)]">{t("title")}</h1>
        <p className="text-body-sm text-[var(--color-text-muted)]">{t("subtitle")}</p>
      </header>
      <SecurityClient enabled={!!(user as any)?.twoFactorEnabled} configured={isTotpConfigured()} />
    </div>
  );
}
