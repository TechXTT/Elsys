import type { Metadata } from "next";
import type { ReactNode } from "react";

import Hero from "@/components/Hero";
import { CarouselHero } from "@/components/CarouselHero";
import { ClubCard } from "@/components/club-card";
import { DocumentRow } from "@/components/document-row";
import { GalleryTile } from "@/components/gallery-tile";
import { HeaderAccent } from "@/components/HeaderAccent";
import { NewsCard } from "@/components/news-card";
import { NumberStat } from "@/components/number-stat";
import { PartnerLogo } from "@/components/partner-logo";
import { PostCard } from "@/components/post-card";
import { SectionHeading } from "@/components/Section";
import { TeamCard } from "@/components/team-card";
import { TestimonialQuote } from "@/components/testimonial-quote";
import { Badge, type BadgeColor } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import type { PostItem } from "@/lib/types";

import { FormDemo } from "./FormDemo";

// Sample content for the Phase D presentational components. Literal copy: dev
// catalog, exempt from next-intl (same exemption as the Phase B/C sections).
const NEWS_POST: PostItem = {
  id: "n1",
  title: "Прием 2026: важни дати и срокове",
  excerpt: "Публикуван е графикът за кандидатстване след 7. клас. Вижте ключовите дати и необходимите документи.",
  date: "2026-06-12",
  href: "/novini/priem-2026",
  image: "/images/news/open-doors.svg",
};
const BLOG_POST: PostItem = {
  id: "b1",
  title: "Как нашите ученици спечелиха олимпиадата",
  date: "2026-06-03",
  href: "/blog/olimpiada",
  image: "/images/news/olympiad-medals.svg",
};
const CAROUSEL_SLIDES = [
  {
    id: "s1",
    title: "Стани част от най-силната ИТ общност",
    subtitle: "Кандидатстване след 7. клас. Запознай се с условията и важните дати.",
    imageDesktop: "/images/carousel/admission-2026.svg",
    linkUrl: "/priem",
    linkLabel: "Виж условията",
  },
  {
    id: "s2",
    title: "HackTUES — нашият хакатон",
    subtitle: "48 часа код, екипи и менторство от индустрията.",
    imageDesktop: "/images/carousel/hack-tues.svg",
    linkUrl: "/blog/hacktues",
    linkLabel: "Научи повече",
  },
];

const PdfIcon = (
  <span className="text-[10px] flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-tag-tint-coral font-bold text-tag-ink-coral">
    PDF
  </span>
);

// Design-system catalog — a successor-facing reference (generational-turnover
// constraint), not production UI. noindex + absent from sitemap.ts. Sample
// copy is intentionally literal: dev tool, exempt from next-intl.
export const metadata: Metadata = {
  title: "UI Preview",
  robots: { index: false, follow: false },
};

const SAMPLE = "Бутон";
const VARIANTS: ButtonVariant[] = ["primary", "secondary", "ghost"];
const SIZES: ButtonSize[] = ["sm", "md", "lg"];
const BADGE_COLOURS: BadgeColor[] = ["blue", "green", "coral", "purple", "teal", "amber"];

const HOVER: Record<ButtonVariant, string> = {
  primary: "!bg-[var(--color-action-primary-hover)]",
  secondary: "!bg-[var(--color-bg-brand-tint)]",
  ghost: "!bg-[var(--color-bg-brand-tint)]",
};

function Panel({
  dark,
  testId,
  children,
}: {
  dark?: boolean;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div
      {...(dark ? { "data-theme": "dark" } : {})}
      {...(testId ? { "data-testid": testId } : {})}
      className="rounded-[var(--radius-lg)] border border-line bg-page p-[var(--spacing-xl)]"
    >
      {children}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section data-testid={id} className="flex flex-col gap-[var(--spacing-md)]">
      <h2 className="text-h3 text-ink-heading">{title}</h2>
      {children}
    </section>
  );
}

function ButtonMatrix() {
  return (
    <div className="flex flex-col gap-[var(--spacing-xl)]">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col gap-[var(--spacing-md)]">
          <h3 className="text-h4 capitalize text-ink-heading">{variant}</h3>
          <div className="grid grid-cols-[7rem_repeat(3,minmax(0,1fr))] items-center gap-x-[var(--spacing-lg)] gap-y-[var(--spacing-md)]">
            <span />
            {SIZES.map((size) => (
              <span key={size} className="text-overline text-ink-muted">
                {size}
              </span>
            ))}
            {(["Default", "Hover", "Disabled"] as const).map((state) => (
              <ButtonRow key={state} variant={variant} state={state} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ButtonRow({ variant, state }: { variant: ButtonVariant; state: "Default" | "Hover" | "Disabled" }) {
  return (
    <>
      <span className="text-body-sm text-ink-muted">{state}</span>
      {SIZES.map((size) => (
        <span key={size}>
          <Button
            variant={variant}
            size={size}
            disabled={state === "Disabled"}
            className={state === "Hover" ? HOVER[variant] : undefined}
          >
            {SAMPLE}
          </Button>
        </span>
      ))}
    </>
  );
}

function BadgeGrid() {
  return (
    <div className="flex flex-wrap gap-x-[var(--spacing-lg)] gap-y-[var(--spacing-md)]">
      {BADGE_COLOURS.map((color) => (
        <div key={color} className="flex items-center gap-[var(--spacing-sm)]">
          <Badge color={color} size="sm">
            Новини
          </Badge>
          <Badge color={color} size="md">
            Новини
          </Badge>
        </div>
      ))}
    </div>
  );
}

export default function UiPreviewPage() {
  return (
    <div
      data-testid="ui-preview"
      className="mx-auto flex max-w-5xl flex-col gap-[var(--spacing-2xl)] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
    >
      <header className="flex flex-col gap-[var(--spacing-2xs)]">
        <h1 className="text-h2 text-ink-heading">UI primitives</h1>
        <p className="text-body text-ink">Phase B · diff each against its Figma node.</p>
      </header>

      <div id="preview-content" className="flex flex-col gap-[var(--spacing-3xl)]">
        <Section id="preview-button" title="Button · 15:56">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="button-light">
              <ButtonMatrix />
            </Panel>
            <Panel dark testId="button-dark">
              <ButtonMatrix />
            </Panel>
          </div>
        </Section>

        <Section id="preview-badge" title="Badge · 35:38">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="badge-light">
              <BadgeGrid />
            </Panel>
            <Panel dark testId="badge-dark">
              <BadgeGrid />
            </Panel>
          </div>
        </Section>

        <Section id="preview-form" title="FormField · Input · Select · Textarea · 17:10 / 18:2">
          <Panel>
            <FormDemo />
          </Panel>
        </Section>

        <Section id="preview-searchbar" title="SearchBar · 18:7">
          <Panel>
            <div className="flex flex-wrap items-center gap-[var(--spacing-lg)]">
              <div className="w-80 max-w-full">
                <SearchBar label="Търсене" placeholder="Търсене..." />
              </div>
              <SearchBar label="Търсене" variant="collapsed" />
            </div>
          </Panel>
        </Section>

        <Section id="preview-pagination" title="Pagination · 19:8">
          <Panel>
            <Pagination
              page={3}
              totalPages={10}
              hrefFor={(p) => `?page=${p}`}
              label="Странициране"
              previousLabel="Предишна страница"
              nextLabel="Следваща страница"
            />
          </Panel>
        </Section>

        <Section id="preview-breadcrumbs" title="Breadcrumbs · 19:2">
          <Panel>
            <Breadcrumbs
              label="Навигация"
              items={[
                { label: "Начало", href: "/bg" },
                { label: "Прием", href: "/bg/priem" },
                { label: "Документи" },
              ]}
            />
          </Panel>
        </Section>

        <Section id="preview-skiplink" title="SkipLink · 19:19">
          <Panel>
            <p className="text-body-sm text-ink-muted">
              Visually hidden until focused — Tab from the top of the page to reveal it
              (it&apos;s the first focusable element).
            </p>
          </Panel>
        </Section>

        <header className="flex flex-col gap-[var(--spacing-2xs)] border-t border-line pt-[var(--spacing-2xl)]">
          <h2 className="text-h2 text-ink-heading">Content components</h2>
          <p className="text-body text-ink-muted">Phase D · diff each against its Figma node.</p>
        </header>

        <Section id="preview-newscard" title="NewsCard · 26:2">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="newscard-light">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <NewsCard post={NEWS_POST} category="RED" categoryLabel="Новини" />
                <NewsCard post={NEWS_POST} featured category="BLUE" categoryLabel="Събитие" />
              </div>
            </Panel>
            <Panel dark testId="newscard-dark">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <NewsCard post={NEWS_POST} category="RED" categoryLabel="Новини" />
                <NewsCard post={NEWS_POST} featured category="BLUE" categoryLabel="Събитие" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="preview-postcard" title="PostCard · 26:11">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="postcard-light">
              <div className="flex flex-col gap-[var(--spacing-md)]">
                <PostCard post={BLOG_POST} eyebrow="Блог" />
                <PostCard post={BLOG_POST} variant="full" eyebrow="Блог" />
              </div>
            </Panel>
            <Panel dark testId="postcard-dark">
              <div className="flex flex-col gap-[var(--spacing-md)]">
                <PostCard post={BLOG_POST} eyebrow="Блог" />
                <PostCard post={BLOG_POST} variant="full" eyebrow="Блог" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="preview-clubcard" title="ClubCard · 26:18">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="clubcard-light">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <ClubCard name="Роботика" description="Клуб по състезателна робототехника и автоматизация." color="GREEN" />
                <ClubCard name="Дебати" description="Клуб по реторика и аргументация." color="PURPLE" />
              </div>
            </Panel>
            <Panel dark testId="clubcard-dark">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <ClubCard name="Роботика" description="Клуб по състезателна робототехника и автоматизация." color="GREEN" />
                <ClubCard name="Дебати" description="Клуб по реторика и аргументация." color="PURPLE" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="preview-teamcard" title="TeamCard · 26:24">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="teamcard-light">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <TeamCard name="инж. Иван Петров" role="Преподавател, Мрежи" contact={{ href: "mailto:ipetrov@elsys-bg.org", label: "ipetrov@elsys-bg.org" }} />
                <TeamCard name="Мария Георгиева" role="Преподавател, Програмиране" />
              </div>
            </Panel>
            <Panel dark testId="teamcard-dark">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <TeamCard name="инж. Иван Петров" role="Преподавател, Мрежи" contact={{ href: "mailto:ipetrov@elsys-bg.org", label: "ipetrov@elsys-bg.org" }} />
                <TeamCard name="Мария Георгиева" role="Преподавател, Програмиране" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="preview-gallerytile" title="GalleryTile · 27:2">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="gallerytile-light">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <GalleryTile image="/images/news/open-doors.svg" alt="Ден на отворените врати" caption="Ден на отворените врати 2026" />
                <GalleryTile image="/images/news/robotics-lab.svg" alt="Лаборатория по роботика" size="lg" />
              </div>
            </Panel>
            <Panel dark testId="gallerytile-dark">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <GalleryTile image="/images/news/open-doors.svg" alt="Ден на отворените врати" caption="Ден на отворените врати 2026" />
                <GalleryTile image="/images/news/robotics-lab.svg" alt="Лаборатория по роботика" size="lg" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="preview-documentrow" title="DocumentRow · 27:6">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="documentrow-light">
              <DocumentRow name="Правилник за дейността на училището.pdf" href="/docs/pravilnik.pdf" fileType="PDF" size="1.4 MB" icon={PdfIcon} />
            </Panel>
            <Panel dark testId="documentrow-dark">
              <DocumentRow name="Правилник за дейността на училището.pdf" href="/docs/pravilnik.pdf" fileType="PDF" size="1.4 MB" icon={PdfIcon} />
            </Panel>
          </div>
        </Section>

        <Section id="preview-partnerlogo" title="PartnerLogo · 27:13">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="partnerlogo-light">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <PartnerLogo name="ТУ-София" logo="/images/logo.svg" />
                <PartnerLogo name="ТУ-София" logo="/images/logo.svg" grayscale href="https://tu-sofia.bg" />
              </div>
            </Panel>
            <Panel dark testId="partnerlogo-dark">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <PartnerLogo name="ТУ-София" logo="/images/logo.svg" />
                <PartnerLogo name="ТУ-София" logo="/images/logo.svg" grayscale href="https://tu-sofia.bg" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="preview-sectionheading" title="SectionHeading · 28:2">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="sectionheading-light">
              <SectionHeading
                title="Нашите"
                highlight="специалности"
                description="Пет професионални направления в сферата на компютърните технологии и електрониката."
              />
            </Panel>
            <Panel dark testId="sectionheading-dark">
              <SectionHeading
                title="Нашите"
                highlight="специалности"
                description="Пет професионални направления в сферата на компютърните технологии и електрониката."
              />
            </Panel>
          </div>
        </Section>

        <Section id="preview-numberstat" title="NumberStat · 28:5">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="numberstat-light">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <NumberStat value="1991" label="Година на основаване" accent="coral" />
                <NumberStat value="98%" label="Приети във ВУЗ" accent="brand" />
              </div>
            </Panel>
            <Panel dark testId="numberstat-dark">
              <div className="grid gap-[var(--spacing-lg)] sm:grid-cols-2">
                <NumberStat value="1991" label="Година на основаване" accent="coral" />
                <NumberStat value="98%" label="Приети във ВУЗ" accent="brand" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="preview-testimonial" title="TestimonialQuote · 28:8">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="testimonial-light">
              <TestimonialQuote
                quote="ТУЕС ми даде не само знания, а начин на мислене, който използвам всеки ден."
                name="Мария Димитрова"
                meta="Випуск 2015 · софтуерен инженер"
              />
            </Panel>
            <Panel dark testId="testimonial-dark">
              <TestimonialQuote
                quote="ТУЕС ми даде не само знания, а начин на мислене, който използвам всеки ден."
                name="Мария Димитрова"
                meta="Випуск 2015 · софтуерен инженер"
              />
            </Panel>
          </div>
        </Section>

        <Section id="preview-headeraccent" title="HeaderAccent · 28:26">
          <div className="grid gap-[var(--spacing-lg)] lg:grid-cols-2">
            <Panel testId="headeraccent-light">
              <div className="flex flex-col gap-[var(--spacing-md)]">
                <HeaderAccent id="preview-info" message="Записването за олимпиади е отворено до 30 юни." priority="info" />
                <HeaderAccent id="preview-urgent" message="Внимание: промяна в графика за изпити на 18 юни." priority="urgent" />
              </div>
            </Panel>
            <Panel dark testId="headeraccent-dark">
              <div className="flex flex-col gap-[var(--spacing-md)]">
                <HeaderAccent id="preview-info-d" message="Записването за олимпиади е отворено до 30 юни." priority="info" />
                <HeaderAccent id="preview-urgent-d" message="Внимание: промяна в графика за изпити на 18 юни." priority="urgent" />
              </div>
            </Panel>
          </div>
        </Section>

        <Section id="preview-hero" title="Hero · 29:2">
          <div className="flex flex-col gap-[var(--spacing-lg)]">
            <Panel testId="hero-light">
              <Hero
                eyebrow="ТУЕС · ОТ 1991"
                heading="Учим бъдещето да работи"
                subheading="Технологично училище „Електронни системи“ към Техническия университет — София."
                cta={{ label: "Кандидатствай", href: "/priem" }}
                secondaryCta={{ label: "Научи повече", href: "/za-nas" }}
              />
            </Panel>
            <Panel dark testId="hero-dark">
              <Hero
                heading="Учим бъдещето да работи"
                subheading="Софтуер, мрежи, електроника и системно програмиране."
                image="/images/news/robotics-lab.svg"
                cta={{ label: "Кандидатствай", href: "/priem" }}
              />
            </Panel>
          </div>
        </Section>

        <Section id="preview-carousel" title="CarouselHero · 29:11">
          <div className="flex flex-col gap-[var(--spacing-lg)]">
            <Panel testId="carousel-light">
              <CarouselHero slides={CAROUSEL_SLIDES} />
            </Panel>
            <Panel dark testId="carousel-dark">
              <CarouselHero slides={CAROUSEL_SLIDES} />
            </Panel>
          </div>
        </Section>
      </div>
    </div>
  );
}
