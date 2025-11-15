import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import Hero from "@/components/Hero";
import { Section } from "@/components/Section";
import { NewsCard } from "@/components/news-card";
import type { Locale } from "@/i18n/config";
import type { PostItem } from "@/lib/types";
import { getBlockDefinition, renderBlockInstance, validateBlocks } from "@/lib/blocks/registry";

type Block = {
  type: string;
  props?: Record<string, unknown> | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function renderBlocks(
  blocks: unknown,
  ctx?: { locale?: Locale; news?: PostItem[] }
): React.ReactNode {
  if (!Array.isArray(blocks)) return null;
  // Try new registry-driven path first
  const result = validateBlocks(blocks);
  if (result.valid) {
    // Insert a line break between blocks to improve readability during editing/preview
    const out: React.ReactNode[] = [];
    result.normalized.forEach((inst, idx) => {
      out.push(<React.Fragment key={`b-${idx}`}>{renderBlockInstance(inst, ctx)}</React.Fragment>);
      if (idx < result.normalized.length - 1) out.push(<br key={`br-${idx}`} />);
    });
    return out;
  }
  // Fallback to legacy switch rendering if validation fails or types missing
  return blocks.map((b, idx) => {
    if (!isRecord(b) || typeof b.type !== "string") return null;
    const props = isRecord(b.props) ? b.props : {};
    const def = getBlockDefinition(b.type);
    if (def) return <React.Fragment key={idx}>{def.render(props as any, ctx)}</React.Fragment>;
    switch (b.type) {
      case "Hero": {
        const p = props as any;
        return <Hero key={idx} heading={p.heading ?? ""} subheading={p.subheading} image={p.image} cta={p.cta} />;
      }
      case "Section": {
        const p = props as any;
        return (
          <Section key={idx} title={p.title ?? "Untitled"} description={p.description}>
            {typeof p.markdown === "string" ? (
              <div className="prose prose-slate max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{p.markdown}</ReactMarkdown>
              </div>
            ) : null}
          </Section>
        );
      }
      case "Markdown": {
        const p = props as any;
        return (
          <div key={idx} className="container-page my-6 prose prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {typeof p?.value === "string" ? p.value : ""}
            </ReactMarkdown>
          </div>
        );
      }
      case "NewsList": {
        const p = props as any;
        const locale = (ctx?.locale as Locale) ?? "bg";
        const items = Array.isArray(ctx?.news) ? ctx!.news : [];
        const limited = items.slice(0, Math.max(1, Math.min(24, Number(p?.limit) || 6)));
        return (
          <Section key={idx} title={p?.title ?? "News"} description={p?.description}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {limited.map((post) => (
                <NewsCard key={post.id ?? post.href} post={post} locale={locale} />
              ))}
              {limited.length === 0 ? (
                <p className="text-sm text-slate-500">No news available in this context.</p>
              ) : null}
            </div>
          </Section>
        );
      }
      default:
        return null;
    }
  });
}
