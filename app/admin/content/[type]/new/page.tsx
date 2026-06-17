import { notFound } from "next/navigation";
import "../../types"; // register all content types
import { getContentType } from "../../registry";
import { createContentRecord } from "../../actions";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { ContentForm } from "../../_components/ContentForm";

interface Props {
  params: { type: string };
}

export default function NewContentPage({ params }: Props) {
  const config = getContentType(params.type);
  if (!config) notFound();

  // Strip the Zod schema — not serializable across the Server -> Client boundary.
  const { schema: _schema, ...clientConfig } = config;
  const action = createContentRecord.bind(null, params.type);

  return (
    <div>
      <PageHeader
        title={`Нов — ${config.labelSingular}`}
        breadcrumbs={[
          { label: "Съдържание" },
          { label: config.labelPlural, href: `/admin/content/${params.type}` },
          { label: "Нов" },
        ]}
      />
      <ContentForm config={clientConfig} action={action} />
    </div>
  );
}
