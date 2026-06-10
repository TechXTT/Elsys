import { notFound } from "next/navigation";
import { getContentType } from "../../registry";
import { updateContentRecord } from "../../actions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { ContentForm } from "../../_components/ContentForm";
import type { ContentRecord } from "@/lib/content/shared";

interface Props {
  params: { type: string; id: string };
}

export default async function EditContentPage({ params }: Props) {
  const config = getContentType(params.type);
  if (!config) notFound();

  const model = (prisma as Record<string, any>)[
    config.modelName.charAt(0).toLowerCase() + config.modelName.slice(1)
  ];

  const record: ContentRecord | null = await model.findUnique({
    where: { id: params.id },
  });
  if (!record) notFound();

  const action = updateContentRecord.bind(null, params.type, params.id);

  return (
    <div>
      <PageHeader
        title={`Редактиране — ${config.labelSingular}`}
        breadcrumbs={[
          { label: "Съдържание" },
          { label: config.labelPlural, href: `/admin/content/${params.type}` },
          { label: "Редактиране" },
        ]}
      />
      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <ContentForm config={config} record={record} action={action} />
      </div>
    </div>
  );
}
