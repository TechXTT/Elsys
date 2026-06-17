import { getTranslations } from "next-intl/server";
import { Upload } from "lucide-react";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { listMedia, getFolderCounts } from "@/lib/media";
import { MediaLibraryClient } from "./_components/MediaLibraryClient";

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const t = await getTranslations("Admin.media");
  const [items, counts] = await Promise.all([listMedia(), getFolderCounts()]);

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        breadcrumbs={[{ label: t("title") }]}
      />
      <MediaLibraryClient items={items} counts={counts} />
    </div>
  );
}
