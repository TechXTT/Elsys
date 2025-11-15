import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import Hero from "@/components/Hero";
import { Section } from "@/components/Section";
import { NewsCard } from "@/components/news-card";
import type { Locale } from "@/i18n/config";
import type { PostItem } from "@/lib/types";

export type BlockContext = { locale?: Locale; news?: PostItem[] };

export type BlockDefinition<P extends Record<string, unknown> = any> = {
  type: string;
  defaults?: Partial<P>;
  validate?: (props: unknown) => { ok: true; props: P } | { ok: false; errors: string[] };
  render: (props: P, ctx?: BlockContext) => React.ReactNode;
};

export type BlockInstance = { type: string; props?: Record<string, unknown> | null };

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// Basic validators (lightweight, no external deps)
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : fallback);
const bool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : fallback);

// Block definitions
const HeroBlock: BlockDefinition<{ heading: string; subheading?: string; image?: string; cta?: { label: string; href: string } }> = {
  type: "Hero",
  validate: (props) => {
    const p = isRecord(props) ? props : {};
    const heading = str(p.heading);
    if (!heading) return { ok: false, errors: ["Hero.heading is required"] } as const;
    return {
      ok: true,
      props: {
        heading,
        subheading: str(p.subheading),
        image: str(p.image),
        cta: isRecord(p.cta) && str(p.cta.label) && str(p.cta.href)
          ? { label: str(p.cta.label), href: str(p.cta.href) }
          : undefined,
      },
    } as const;
  },
  render: (p) => <Hero heading={p.heading} subheading={p.subheading} image={p.image} cta={p.cta as any} />,
};

const SectionBlock: BlockDefinition<{ title: string; description?: string; markdown?: string }> = {
  type: "Section",
  validate: (props) => {
    const p = isRecord(props) ? props : {};
    const title = str(p.title);
    if (!title) return { ok: false, errors: ["Section.title is required"] } as const;
    return { ok: true, props: { title, description: str(p.description), markdown: str(p.markdown) } } as const;
  },
  render: (p) => (
    <Section title={p.title} description={p.description}>
      {p.markdown ? (
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{p.markdown}</ReactMarkdown>
        </div>
      ) : null}
    </Section>
  ),
};

const MarkdownBlock: BlockDefinition<{ value: string }> = {
  type: "Markdown",
  validate: (props) => {
    const p = isRecord(props) ? props : {};
    return { ok: true, props: { value: str(p.value) } } as const;
  },
  render: (p) => (
    <div className="container-page my-6 prose prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{p.value}</ReactMarkdown>
    </div>
  ),
};

const NewsListBlock: BlockDefinition<{ title?: string; description?: string; limit?: number }> = {
  type: "NewsList",
  validate: (props) => {
    const p = isRecord(props) ? props : {};
    return { ok: true, props: { title: str(p.title), description: str(p.description), limit: num(p.limit) } } as const;
  },
  render: (p, ctx) => {
    const locale = (ctx?.locale as Locale) ?? "bg";
    const items = Array.isArray(ctx?.news) ? ctx!.news : [];
    const limited = items.slice(0, Math.max(1, Math.min(24, Number(p?.limit) || 6)));
    return (
      <Section title={p?.title ?? "News"} description={p?.description}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {limited.map((post) => (
            <NewsCard key={post.id ?? post.href} post={post} locale={locale} />
          ))}
          {limited.length === 0 ? <p className="text-sm text-slate-500">No news available in this context.</p> : null}
        </div>
      </Section>
    );
  },
};

// Placeholders for upcoming blocks
const Placeholder = ({ name }: { name: string }) => (
  <div className="container-page my-6 rounded border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
    {name} block not implemented yet.
  </div>
);

const TestimonialsBlock: BlockDefinition<Record<string, unknown>> = {
  type: "Testimonials",
  render: () => <Placeholder name="Testimonials" />,
};

const AdmissionsTimelineBlock: BlockDefinition<Record<string, unknown>> = {
  type: "AdmissionsTimeline",
  render: () => <Placeholder name="AdmissionsTimeline" />,
};

const CTABlock: BlockDefinition<Record<string, unknown>> = {
  type: "CTA",
  render: () => <Placeholder name="CTA" />,
};

const GridBlock: BlockDefinition<Record<string, unknown>> = {
  type: "Grid",
  render: () => <Placeholder name="Grid" />,
};

const MediaGalleryBlock: BlockDefinition<Record<string, unknown>> = {
  type: "MediaGallery",
  render: () => <Placeholder name="MediaGallery" />,
};

export const blockRegistry: BlockDefinition[] = [
  HeroBlock,
  SectionBlock,
  MarkdownBlock,
  NewsListBlock,
  TestimonialsBlock,
  AdmissionsTimelineBlock,
  CTABlock,
  GridBlock,
  MediaGalleryBlock,
];

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return blockRegistry.find((d) => d.type === type);
}

export function validateBlocks(blocks: unknown): { valid: boolean; errors: string[]; normalized: BlockInstance[] } {
  const errors: string[] = [];
  if (!Array.isArray(blocks)) return { valid: false, errors: ["Blocks must be an array"], normalized: [] };
  const normalized: BlockInstance[] = [];
  blocks.forEach((raw, idx) => {
    if (!isRecord(raw) || typeof raw.type !== "string") {
      errors.push(`Block[${idx}] must be an object with a string 'type'`);
      return;
    }
    const def = getBlockDefinition(raw.type);
    const rawProps = isRecord(raw.props) ? raw.props : {};
    if (def?.validate) {
      const res = def.validate(rawProps);
      if (!res.ok) {
        res.errors.forEach((e) => errors.push(`Block[${idx}] ${raw.type}: ${e}`));
        return;
      }
      normalized.push({ type: raw.type, props: res.props });
    } else {
      // No validator; accept as-is
      normalized.push({ type: raw.type, props: rawProps });
    }
  });
  return { valid: errors.length === 0, errors, normalized };
}

export function renderBlockInstance(instance: BlockInstance, ctx?: BlockContext) {
  const def = getBlockDefinition(instance.type);
  if (!def) return null;
  const props = (instance.props ?? {}) as any;
  return def.render(props, ctx);
}
