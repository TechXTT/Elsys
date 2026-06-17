import { notFound } from "next/navigation";
import "../../types"; // register all content types
import { getContentType } from "../../registry";
import { updateContentRecord } from "../../actions";
import { prisma } from "@/lib/prisma";
import { getSuccessorNote } from "@/lib/content/successor-notes";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { ContentForm } from "../../_components/ContentForm";
import type { ContentRecord } from "@/lib/content/shared";

interface Props {
  params: { type: string; id: string };
}

export default async function EditContentPage({ params }: Props) {
  const config = getContentType(params.type);
  if (!config) notFound();

  // Strip the Zod schema — not serializable across the Server -> Client boundary.
  const { schema: _schema, ...clientConfig } = config;

  const model = (prisma as Record<string, any>)[
    config.modelName.charAt(0).toLowerCase() + config.modelName.slice(1)
  ];

  const record: ContentRecord | null = await model.findUnique({ where: { id: params.id } });
  if (!record) notFound();

  const successorNote =
    config.enableSuccessorNote !== false ? await getSuccessorNote(config.modelName, params.id) : null;

  const action = updateContentRecord.bind(null, params.type, params.id);
  const title = String(record[config.titleField ?? "title"] ?? config.labelSingular);

  return (
    <div>
      <PageHeader
        title={`Редактиране: ${title}`}
        breadcrumbs={[
          { label: "Съдържание" },
          { label: config.labelPlural, href: `/admin/content/${params.type}` },
          { label: "Редактиране" },
        ]}
      />
      <ContentForm config={clientConfig} record={record} action={action} successorNote={successorNote} />
    </div>
  );
}
