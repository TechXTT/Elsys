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
      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <ContentForm config={config} action={action} />
      </div>
    </div>
  );
}
