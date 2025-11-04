import React from "react";
import ReactMarkdown from "react-markdown";
import Hero from "@/components/Hero";
import { Section } from "@/components/Section";

type Block = {
  type: string;
  props?: Record<string, unknown> | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function renderBlocks(blocks: unknown): React.ReactNode {
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
      default:
        return null;
    }
  });
}
