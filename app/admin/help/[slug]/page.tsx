import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageHeader } from "@/app/admin/components/PageHeader";
import { getHelpArticle } from "@/lib/help";

export const dynamic = "force-dynamic";

export default async function HelpArticlePage({ params }: { params: { slug: string } }) {
  const t = await getTranslations("Admin.help");
  const article = await getHelpArticle(params.slug);
  if (!article) notFound();

  return (
    <div>
      <PageHeader
        title={article.title}
        description={article.summary ?? undefined}
        breadcrumbs={[{ label: t("title"), href: "/admin/help" }, { label: article.title }]}
        actions={
          <Link href={`/admin/content/help/${params.slug}`} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-3 py-2 text-body-sm text-ink hover:bg-[var(--color-bg-subtle)]">
            <Pencil className="h-4 w-4" /> {t("editArticle")}
          </Link>
        }
      />
      {article.status === "DRAFT" && (
        <p className="mb-4 inline-block rounded-[var(--radius-md)] bg-[var(--color-status-warning-bg)] px-3 py-1 text-caption text-[var(--color-status-warning-text)]">{t("draftNote")}</p>
      )}
      <article className="max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-6 text-body text-ink [&_a]:text-ink-link [&_a]:underline [&_h2]:mt-4 [&_h2]:text-h3 [&_h2]:text-ink-heading [&_h3]:text-h4 [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_ul]:list-disc [&_ul]:pl-4 [&_blockquote]:border-l-4 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_blockquote]:text-ink-muted">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.body}</ReactMarkdown>
      </article>
      <Link href="/admin/help" className="mt-6 inline-flex items-center gap-1 text-body-sm text-[var(--color-action-primary)] hover:underline">
        <ArrowLeft className="h-4 w-4" /> {t("backToHelp")}
      </Link>
    </div>
  );
}
