import React from "react";
import ReactMarkdown from "react-markdown";
import Hero from "@/components/Hero";
import { Section } from "@/components/Section";
import { NewsCard } from "@/components/news-card";
import type { Locale } from "@/i18n/config";
import { loadNewsJson } from "@/lib/content";

type Block = {
  type: string;
  props?: Record<string, unknown> | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function renderBlocks(blocks: unknown, ctx?: { locale?: Locale }): React.ReactNode {
  if (!Array.isArray(blocks)) return null;
  return blocks.map((b, idx) => {
    if (!isRecord(b) || typeof b.type !== "string") return null;
    const props = isRecord(b.props) ? b.props : {};
    switch (b.type) {
      case "Hero": {
        const p = props as any;
        return <Hero key={idx} heading={p.heading ?? ""} subheading={p.subheading} image={p.image} cta={p.cta} />;
      }
      case "Section": {
        const p = props as any;
        return (
          <Section key={idx} title={p.title ?? "Untitled"} description={p.description}>
            {typeof p.markdown === "string" ? <div className="prose prose-slate max-w-none dark:prose-invert"><ReactMarkdown>{p.markdown}</ReactMarkdown></div> : null}
          </Section>
        );
      }
      case "Markdown": {
        const p = props as any;
        return (
          <div key={idx} className="container-page my-6 prose prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown>{typeof p?.value === "string" ? p.value : ""}</ReactMarkdown>
          </div>
        );
      }
      case "NewsList": {
        const p = props as any;
        const locale = (ctx?.locale as Locale) ?? "bg";
        const items = loadNewsJson(locale).slice(0, Math.max(1, Math.min(24, Number(p?.limit) || 6)));
        return (
          <Section key={idx} title={p?.title ?? "News"} description={p?.description}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {items.map((post) => (
                <NewsCard key={post.id ?? post.href} post={post} locale={locale} />
              ))}
            </div>
          </Section>
        );
      }
      default:
        return null;
    }
  });
}
