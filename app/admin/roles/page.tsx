import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { currentRole } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { RolesClient } from "./RolesClient";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  // View is itself gated by roles:manage (ADMIN). Others are bounced to /admin.
  const role = await currentRole();
  if (!role) redirect("/admin/login");
  if (!can(role, "roles:manage")) redirect("/admin");

  const t = await getTranslations("Admin.roles");
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} breadcrumbs={[{ label: t("title") }]} />
      <RolesClient users={users} />
    </div>
  );
}
