import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { FileText } from "lucide-react";
import type { ColorTag } from "@prisma/client";

import Hero from "@/components/Hero";
import { SectionHeading } from "@/components/Section";
import { NewsCard } from "@/components/news-card";
import { NumberStat } from "@/components/number-stat";
import { TestimonialQuote } from "@/components/testimonial-quote";
import { ClubCard } from "@/components/club-card";
import { TeamCard } from "@/components/team-card";
import { GalleryTile } from "@/components/gallery-tile";
import { DocumentRow } from "@/components/document-row";
import { PartnerLogo } from "@/components/partner-logo";
import { HeaderAccent } from "@/components/HeaderAccent";
import { CarouselHero, type CarouselSlide } from "@/components/CarouselHero";
import { ButtonLink } from "@/components/ui/Button";
import type { Locale } from "@/i18n/config";
import type { PostItem } from "@/lib/types";

export type BlockContext = { locale?: Locale; news?: PostItem[]; carouselSlides?: CarouselSlide[] };

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

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : fallback);
const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter(isRecord) : [];

/** Locale-relative internal hrefs for next-intl; strip a leading locale prefix. */
function hrefProps(href: string): { href: string; external?: boolean } {
  if (/^https?:\/\//.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return { href, external: true };
  }
  return { href: href.replace(/^\/(?:bg|en)(?=\/|$)/, "") || "/" };
}

// Shared section shell — consistent rhythm; blocks own their container.
function Band({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`container-page py-[var(--spacing-2xl)] ${className}`}>{children}</section>;
}

// Tokenised markdown body (prose-equivalent without the typography plugin churn).
function Prose({ children }: { children: string }) {
  return (
    <div className="text-body flex flex-col gap-[var(--spacing-md)] text-ink [&_a]:text-ink-link [&_a]:underline [&_h2]:text-h3 [&_h2]:text-ink-heading [&_h3]:text-h4 [&_h3]:text-ink-heading [&_ol]:list-decimal [&_ol]:pl-[var(--spacing-lg)] [&_ul]:list-disc [&_ul]:pl-[var(--spacing-lg)] [&_strong]:font-semibold">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{children}</ReactMarkdown>
    </div>
  );
}

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};
const gridCols = (n: number) => COLS[Math.min(4, Math.max(1, n || 3))] ?? COLS[3];

// ---------------------------------------------------------------------------
// Block definitions — each maps to a Phase-D design component, token-bound.
// ---------------------------------------------------------------------------

const HeroBlock: BlockDefinition<{ heading: string; subheading?: string; eyebrow?: string; image?: string; cta?: { label: string; href: string }; secondaryCta?: { label: string; href: string } }> = {
  type: "Hero",
  validate: (props) => {
    const p = isRecord(props) ? props : {};
    const heading = str(p.heading);
    if (!heading) return { ok: false, errors: ["Hero.heading is required"] } as const;
    const cta = isRecord(p.cta) && str(p.cta.label) && str(p.cta.href) ? { label: str(p.cta.label), href: str(p.cta.href) } : undefined;
    const secondaryCta = isRecord(p.secondaryCta) && str(p.secondaryCta.label) && str(p.secondaryCta.href) ? { label: str(p.secondaryCta.label), href: str(p.secondaryCta.href) } : undefined;
    return { ok: true, props: { heading, subheading: str(p.subheading), eyebrow: str(p.eyebrow), image: str(p.image), cta, secondaryCta } } as const;
  },
  render: (p) => (
    <Band>
      <Hero heading={p.heading} subheading={p.subheading} eyebrow={p.eyebrow || undefined} image={p.image || undefined} cta={p.cta} secondaryCta={p.secondaryCta} />
    </Band>
  ),
};

const SectionBlock: BlockDefinition<{ title: string; highlight?: string; description?: string; markdown?: string }> = {
  type: "Section",
  validate: (props) => {
    const p = isRecord(props) ? props : {};
    const title = str(p.title);
    if (!title) return { ok: false, errors: ["Section.title is required"] } as const;
    return { ok: true, props: { title, highlight: str(p.highlight), description: str(p.description), markdown: str(p.markdown) } } as const;
  },
  render: (p) => (
    <Band className="flex flex-col gap-[var(--spacing-lg)]">
      <SectionHeading as="h2" title={p.title} highlight={p.highlight || undefined} description={p.description || undefined} />
      {p.markdown ? <Prose>{p.markdown}</Prose> : null}
    </Band>
  ),
};

const MarkdownBlock: BlockDefinition<{ value: string }> = {
  type: "Markdown",
  render: (p) => (
    <Band className="!py-[var(--spacing-lg)]">
      <Prose>{str((p as Record<string, unknown>).value)}</Prose>
    </Band>
  ),
};

const DividerBlock: BlockDefinition<{ style?: string }> = {
  type: "Divider",
  render: (p) => (
    <div className="container-page py-[var(--spacing-md)]">
      <hr className={`border-0 border-t ${str((p as Record<string, unknown>).style) === "dashed" ? "border-dashed" : ""} border-line`} />
    </div>
  ),
};

const SPACER: Record<string, string> = { sm: "h-[var(--spacing-md)]", md: "h-[var(--spacing-2xl)]", lg: "h-[var(--spacing-4xl)]" };
const SpacerBlock: BlockDefinition<{ height?: string }> = {
  type: "Spacer",
  render: (p) => <div aria-hidden className={SPACER[str((p as Record<string, unknown>).height, "md")] ?? SPACER.md} />,
};

const QuoteBlock: BlockDefinition<{ text: string; author?: string; role?: string }> = {
  type: "Quote",
  render: (p) => {
    const r = p as Record<string, unknown>;
    return (
      <Band>
        <TestimonialQuote quote={str(r.text)} name={str(r.author)} meta={str(r.role) || undefined} />
      </Band>
    );
  },
};

const StatsBlock: BlockDefinition<{ items?: unknown }> = {
  type: "Stats",
  render: (p) => {
    const items = arr((p as Record<string, unknown>).items);
    if (!items.length) return null;
    return (
      <Band>
        <div className={`grid gap-[var(--spacing-lg)] ${gridCols(items.length > 4 ? 4 : items.length)}`}>
          {items.map((it, i) => (
            <NumberStat key={i} value={str(it.value)} label={str(it.label)} accent={i % 2 === 0 ? "brand" : "coral"} />
          ))}
        </div>
      </Band>
    );
  },
};

const FeaturesBlock: BlockDefinition<{ title?: string; items?: unknown }> = {
  type: "Features",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const items = arr(r.items);
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <div className={`grid gap-[var(--spacing-lg)] ${gridCols(3)}`}>
          {items.map((it, i) => (
            <div key={i} className="flex h-full flex-col gap-[var(--spacing-2xs)] rounded-[var(--radius-lg)] border border-line bg-surface p-[var(--spacing-lg)]">
              <h3 className="text-h4 text-ink-heading">{str(it.title)}</h3>
              <p className="text-body text-ink-muted">{str(it.description)}</p>
            </div>
          ))}
        </div>
      </Band>
    );
  },
};

const MediaGalleryBlock: BlockDefinition<{ title?: string; images?: unknown }> = {
  type: "MediaGallery",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const images = arr(r.images);
    if (!images.length) return null;
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <div className={`grid gap-[var(--spacing-lg)] ${gridCols(3)}`}>
          {images.map((img, i) => (
            <GalleryTile key={i} image={str(img.src)} alt={str(img.alt)} caption={str(img.caption) || undefined} />
          ))}
        </div>
      </Band>
    );
  },
};

const EmbedBlock: BlockDefinition<{ url: string; aspectRatio?: string }> = {
  type: "Embed",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const url = str(r.url);
    if (!url) return null;
    const ratio = str(r.aspectRatio) === "4:3" ? "aspect-[4/3]" : "aspect-video";
    return (
      <Band>
        <div className={`relative w-full overflow-hidden rounded-[var(--radius-lg)] ${ratio}`}>
          <iframe src={url} title="Embedded content" loading="lazy" allowFullScreen className="absolute inset-0 h-full w-full border-0" />
        </div>
      </Band>
    );
  },
};

const NewsListBlock: BlockDefinition<{ title?: string; description?: string; limit?: number }> = {
  type: "NewsList",
  validate: (props) => {
    const p = isRecord(props) ? props : {};
    return { ok: true, props: { title: str(p.title), description: str(p.description), limit: num(p.limit) } } as const;
  },
  render: (p, ctx) => {
    const locale = (ctx?.locale as Locale) ?? "bg";
    const items = (Array.isArray(ctx?.news) ? ctx!.news : []).slice(0, Math.max(1, Math.min(24, Number(p?.limit) || 6)));
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        <SectionHeading as="h2" title={p?.title || "Новини"} description={p?.description || undefined} />
        {items.length === 0 ? (
          <p className="text-body text-ink-muted">—</p>
        ) : (
          <div className={`grid gap-[var(--spacing-lg)] ${gridCols(3)}`}>
            {items.map((post) => (
              <NewsCard key={post.id ?? post.href} post={post} locale={locale} category={post.colorTag} categoryLabel={post.category} />
            ))}
          </div>
        )}
      </Band>
    );
  },
};

const TestimonialsBlock: BlockDefinition<{ title?: string; items?: unknown }> = {
  type: "Testimonials",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const items = arr(r.items);
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <div className={`grid gap-[var(--spacing-lg)] ${gridCols(3)}`}>
          {items.map((it, i) => (
            <TestimonialQuote key={i} quote={str(it.quote)} name={str(it.author)} meta={str(it.role) || undefined} photo={str(it.image) || undefined} />
          ))}
        </div>
      </Band>
    );
  },
};

const AdmissionsTimelineBlock: BlockDefinition<{ title?: string; steps?: unknown }> = {
  type: "AdmissionsTimeline",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const steps = arr(r.steps);
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <ol className="flex flex-col gap-[var(--spacing-md)]">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-[var(--spacing-md)] rounded-[var(--radius-lg)] border border-line bg-surface p-[var(--spacing-lg)]">
              <span aria-hidden className="text-body flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-brand-tint font-semibold text-ink-link">
                {i + 1}
              </span>
              <div className="flex flex-col gap-[var(--spacing-2xs)]">
                <div className="flex flex-wrap items-baseline gap-[var(--spacing-sm)]">
                  <h3 className="text-h4 text-ink-heading">{str(s.title)}</h3>
                  {str(s.date) ? <span className="text-caption text-ink-muted">{str(s.date)}</span> : null}
                </div>
                {str(s.description) ? <p className="text-body text-ink-muted">{str(s.description)}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </Band>
    );
  },
};

const CTABlock: BlockDefinition<{ title: string; description?: string; primaryButton?: { label: string; href: string }; secondaryButton?: { label: string; href: string } }> = {
  type: "CTA",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const primary = isRecord(r.primaryButton) ? r.primaryButton : null;
    const secondary = isRecord(r.secondaryButton) ? r.secondaryButton : null;
    return (
      <Band>
        <div className="flex flex-col items-center gap-[var(--spacing-md)] rounded-[var(--radius-lg)] bg-brand-tint px-[var(--spacing-lg)] py-[var(--spacing-2xl)] text-center">
          <SectionHeading as="h2" align="center" title={str(r.title)} />
          {str(r.description) ? <p className="text-body-lg max-w-2xl text-ink-muted">{str(r.description)}</p> : null}
          <div className="flex flex-wrap justify-center gap-[var(--spacing-sm)]">
            {primary && str(primary.label) && str(primary.href) ? (
              <ButtonLink variant="primary" size="lg" {...hrefProps(str(primary.href))}>{str(primary.label)}</ButtonLink>
            ) : null}
            {secondary && str(secondary.label) && str(secondary.href) ? (
              <ButtonLink variant="secondary" size="lg" {...hrefProps(str(secondary.href))}>{str(secondary.label)}</ButtonLink>
            ) : null}
          </div>
        </div>
      </Band>
    );
  },
};

const AccordionBlock: BlockDefinition<{ title?: string; items?: unknown }> = {
  type: "Accordion",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const items = arr(r.items);
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <div className="flex flex-col gap-[var(--spacing-sm)]">
          {items.map((it, i) => (
            <details key={i} className="rounded-[var(--radius-md)] border border-line bg-surface p-[var(--spacing-md)]">
              <summary className="text-body cursor-pointer font-semibold text-ink-heading">{str(it.question)}</summary>
              <div className="mt-[var(--spacing-sm)]">
                <Prose>{str(it.answer)}</Prose>
              </div>
            </details>
          ))}
        </div>
      </Band>
    );
  },
};

// Tabs degrade to stacked labelled sections (no client JS this phase — flagged).
const TabsBlock: BlockDefinition<{ tabs?: unknown }> = {
  type: "Tabs",
  render: (p) => {
    const tabs = arr((p as Record<string, unknown>).tabs);
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {tabs.map((t, i) => (
          <div key={i} className="flex flex-col gap-[var(--spacing-sm)]">
            <h3 className="text-h4 text-ink-heading">{str(t.label)}</h3>
            <Prose>{str(t.content)}</Prose>
          </div>
        ))}
      </Band>
    );
  },
};

const GridBlock: BlockDefinition<{ columns?: number; items?: unknown }> = {
  type: "Grid",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const items = arr(r.items);
    return (
      <Band>
        <div className={`grid gap-[var(--spacing-lg)] ${gridCols(num(r.columns, 3))}`}>
          {items.map((it, i) => (
            <div key={i} className="flex h-full flex-col gap-[var(--spacing-2xs)] rounded-[var(--radius-lg)] border border-line bg-surface p-[var(--spacing-lg)]">
              <h3 className="text-h4 text-ink-heading">{str(it.title)}</h3>
              <p className="text-body text-ink-muted">{str(it.description)}</p>
              {str(it.href) ? (
                <ButtonLink variant="ghost" size="sm" className="mt-auto self-start !px-0" {...hrefProps(str(it.href))}>→</ButtonLink>
              ) : null}
            </div>
          ))}
        </div>
      </Band>
    );
  },
};

const CarouselHeroBlock: BlockDefinition<Record<string, unknown>> = {
  type: "CarouselHero",
  render: (_, ctx) => <CarouselHero slides={ctx?.carouselSlides ?? []} />,
};

// --- New E2 block types (added to admin meta + defaults to stay in agreement) ---

const TeamGridBlock: BlockDefinition<{ title?: string; items?: unknown }> = {
  type: "TeamGrid",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const items = arr(r.items);
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <div className={`grid gap-[var(--spacing-lg)] ${gridCols(4)}`}>
          {items.map((it, i) => (
            <TeamCard
              key={i}
              name={str(it.name)}
              role={str(it.role) || undefined}
              photo={str(it.photo) || undefined}
              contact={str(it.email) ? { href: `mailto:${str(it.email)}`, label: str(it.email) } : undefined}
            />
          ))}
        </div>
      </Band>
    );
  },
};

const PartnerGridBlock: BlockDefinition<{ title?: string; grayscale?: boolean; items?: unknown }> = {
  type: "PartnerGrid",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const items = arr(r.items);
    const grayscale = r.grayscale !== false;
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <div className={`grid items-center gap-[var(--spacing-lg)] ${gridCols(4)}`}>
          {items.map((it, i) => (
            <PartnerLogo key={i} name={str(it.name)} logo={str(it.logo)} href={str(it.href) || undefined} grayscale={grayscale} />
          ))}
        </div>
      </Band>
    );
  },
};

const DocumentListBlock: BlockDefinition<{ title?: string; items?: unknown }> = {
  type: "DocumentList",
  render: (p) => {
    const r = p as Record<string, unknown>;
    const items = arr(r.items);
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <div className="flex flex-col gap-[var(--spacing-sm)]">
          {items.map((it, i) => {
            const type = str(it.fileType) || "FILE";
            return (
              <DocumentRow
                key={i}
                name={str(it.name)}
                href={str(it.href)}
                fileType={type}
                size={str(it.size) || undefined}
                icon={
                  <span className="text-[9px] flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-tag-tint-coral font-bold text-tag-ink-coral">
                    <FileText size={18} aria-hidden />
                  </span>
                }
              />
            );
          })}
        </div>
      </Band>
    );
  },
};

const ClubGridBlock: BlockDefinition<{ title?: string; items?: unknown }> = {
  type: "ClubGrid",
  render: (p, ctx) => {
    const r = p as Record<string, unknown>;
    const items = arr(r.items);
    return (
      <Band className="flex flex-col gap-[var(--spacing-lg)]">
        {str(r.title) ? <SectionHeading as="h2" title={str(r.title)} /> : null}
        <div className={`grid gap-[var(--spacing-lg)] ${gridCols(3)}`}>
          {items.map((it, i) => (
            <ClubCard
              key={i}
              name={str(it.name)}
              description={str(it.description) || undefined}
              color={(str(it.color) || "BLUE") as ColorTag}
              href={str(it.href) || undefined}
              locale={ctx?.locale}
            />
          ))}
        </div>
      </Band>
    );
  },
};

const HeaderAccentBlock: BlockDefinition<{ id?: string; message: string; priority?: string }> = {
  type: "HeaderAccent",
  render: (p) => {
    const r = p as Record<string, unknown>;
    if (!str(r.message)) return null;
    return (
      <div className="container-page pt-[var(--spacing-lg)]">
        <HeaderAccent id={str(r.id) || "page-accent"} message={str(r.message)} priority={str(r.priority) === "urgent" ? "urgent" : "info"} />
      </div>
    );
  },
};

export const blockRegistry: BlockDefinition[] = [
  HeroBlock,
  SectionBlock,
  MarkdownBlock,
  DividerBlock,
  SpacerBlock,
  QuoteBlock,
  StatsBlock,
  FeaturesBlock,
  MediaGalleryBlock,
  EmbedBlock,
  NewsListBlock,
  TestimonialsBlock,
  AdmissionsTimelineBlock,
  CTABlock,
  AccordionBlock,
  TabsBlock,
  GridBlock,
  CarouselHeroBlock,
  TeamGridBlock,
  PartnerGridBlock,
  DocumentListBlock,
  ClubGridBlock,
  HeaderAccentBlock,
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
