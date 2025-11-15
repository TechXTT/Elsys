/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

function gid(prefix = 'G|static') {
  return `${prefix}|${crypto.randomUUID()}`;
}

// Section folders (per locale)
const sections = {
  'uchilishteto': {
    groupId: gid('G|section|uchilishteto'),
    locales: {
      bg: { slug: 'uchilishteto', title: 'Училището', navLabel: 'Училището' },
      en: { slug: 'school', title: 'The School', navLabel: 'The School' },
    },
  },
  'obuchenie': {
    groupId: gid('G|section|obuchenie'),
    locales: {
      bg: { slug: 'obuchenie', title: 'Обучение', navLabel: 'Обучение' },
      en: { slug: 'education', title: 'Education', navLabel: 'Education' },
    },
  },
  'priem': {
    groupId: gid('G|section|priem'),
    locales: {
      bg: { slug: 'priem', title: 'Прием', navLabel: 'Прием' },
      en: { slug: 'admissions', title: 'Admissions', navLabel: 'Admissions' },
    },
  },
  'uchenicheski-jivot': {
    groupId: gid('G|section|uchenicheski-jivot'),
    locales: {
      bg: { slug: 'uchenicheski-zhivot', title: 'Ученически живот', navLabel: 'Ученически живот' },
      en: { slug: 'student-life', title: 'Student Life', navLabel: 'Student Life' },
    },
  },
};

// Static page list derived from user input
const items = [
  { full: 'uchilishteto/misija', titleBg: 'Мисия', titleEn: 'Mission', enSlug: 'mission', summaryEn: 'Mission of TUES as a specialized tech school preparing future IT leaders.' },
  { full: 'uchilishteto/istorija', titleBg: 'История', titleEn: 'History', enSlug: 'history', summaryEn: 'Historical overview of TUES since its founding and development.' },
  { full: 'uchilishteto/obshtestven-syvet', titleBg: 'Обществен съвет', titleEn: 'Public Council', enSlug: 'public-council', summaryEn: 'Information about the Public Council of the school and its role.' },
  { full: 'uchilishteto/lideri-zavyrshili-tues', titleBg: 'Лидери завършили ТУЕС', titleEn: 'Alumni Leaders', enSlug: 'alumni-leaders', summaryEn: 'Showcase of notable alumni in leadership roles.' },
  { full: 'uchilishteto/prepodavatelski-ekip', titleBg: 'Преподавателски екип', titleEn: 'Teaching Staff', enSlug: 'teaching-staff', summaryEn: 'Description of the teaching staff: school teachers, young specialists and TU-Sofia lecturers.' },
  { full: 'uchilishteto/asociacija-na-zavyrshilite-tues', titleBg: 'Асоциация на Завършилите ТУЕС', titleEn: 'TUES Alumni Association', enSlug: 'alumni-association', summaryEn: 'Page about the Alumni Association of TUES (АЗТУЕС).' },
  { full: 'uchilishteto/pravilnici-i-dokumenti', titleBg: 'Правилници и документи', titleEn: 'Rules and Documents', enSlug: 'rules-and-documents', summaryEn: 'Hub with links to official rules, regulations and useful documents.' },
  { full: 'uchilishteto/tues-v-chisla', titleBg: 'ТУЕС в числа', titleEn: 'TUES in Numbers', enSlug: 'tues-in-numbers', summaryEn: 'Key statistics and numbers about TUES.' },
  { full: 'uchilishteto/kontakti', titleBg: 'Контакти', titleEn: 'Contacts', enSlug: 'contacts', summaryEn: 'Contact information, address, phone, email and directions.' },
  { full: 'obuchenie/inovativen-ucheben-podhod', titleBg: 'Иновативен учебен подход', titleEn: 'Innovative Educational Approach', enSlug: 'innovative-education-approach', summaryEn: 'Overview of the innovative 5-year educational approach at TUES.' },
  { full: 'obuchenie/uchebna-programa', titleBg: 'Учебна програма', titleEn: 'Curriculum', enSlug: 'curriculum', summaryEn: 'Overview and links to detailed curricula for grades 8–12.' },
  { full: 'obuchenie/profesionalno-obrazovanie', titleBg: 'Професионално образование', titleEn: 'Vocational Education', enSlug: 'vocational-education', summaryEn: 'Description of the vocational education directions and specialties.' },
  { full: 'obuchenie/integracija-s-tehnicheskija-uniersitet', titleBg: 'Интеграция с ТУ – София', titleEn: 'Integration with TU - Sofia', enSlug: 'integration-with-tu-sofia', summaryEn: 'Explains how TUES is integrated with the Technical University of Sofia.' },
  { full: 'obuchenie/diplomna-rabota', titleBg: 'Дипломна работа', titleEn: 'Diploma Thesis', enSlug: 'diploma-thesis', summaryEn: 'Information about the diploma thesis in 12th grade and its role.' },
  { full: 'obuchenie/cisco-akademija', titleBg: 'Cisco Академия', titleEn: 'Cisco Academy', enSlug: 'cisco-academy', summaryEn: 'Page about the Cisco Academy at TUES and networking training.' },
  { full: 'obuchenie/partniorstvo-s-biznesa', titleBg: 'INVESTech / партньорство с бизнеса', titleEn: 'INVESTech / Business Partnerships', enSlug: 'investech-business-partnerships', summaryEn: 'Description of the INVESTech project and partnerships with business.' },
  { full: 'obuchenie/uchebna-praktika-po-specialnostta', titleBg: 'Учебна практика по специалността', titleEn: 'Specialty Practicum', enSlug: 'specialty-practicum', summaryEn: 'Explains the 11th-grade specialty practicum in partner IT companies.' },
  { full: 'priem/specialnost-sistemno-programirane', titleBg: 'Специалност Системно програмиране', titleEn: 'Specialty: System Programming', enSlug: 'specialty-system-programming', summaryEn: 'Details of the System Programming specialty and main subjects.' },
  { full: 'priem/zashto-da-izbera-tues', titleBg: 'Защо да избера ТУЕС?', titleEn: 'Why Choose TUES?', enSlug: 'why-choose-tues', summaryEn: 'Reasons why prospective students should choose TUES.' },
  { full: 'priem/specialnost-komputyrni-mreji', titleBg: 'Специалност Компютърни мрежи', titleEn: 'Specialty: Computer Networks', enSlug: 'specialty-computer-networks', summaryEn: 'Details of the Computer Networks specialty and training focus.' },
  { full: 'priem/den-na-otvorenite-vrati', titleBg: 'ТУЕС Фест – Ден на отворените врати', titleEn: 'TUES Fest – Open Day', enSlug: 'tues-fest-open-day', summaryEn: 'Page describing TUES Fest – the open day with student projects.' },
  { full: 'priem/specialnost-programirane-na-izkustven-intelekt', titleBg: 'Специалност Програмиране на изкуствен интелект', titleEn: 'Specialty: Artificial Intelligence Programming', enSlug: 'specialty-artificial-intelligence-programming', summaryEn: 'Presentation of the AI Programming specialty.' },
  { full: 'priem/red-i-uslovija-za-priem', titleBg: 'Ред и условия за прием', titleEn: 'Admission Rules and Conditions', enSlug: 'admission-rules-and-conditions', summaryEn: 'Rules, conditions and timelines for admissions after 7th grade.' },
  { full: 'uchenicheski-jivot/tues-talks', titleBg: 'TUES Talks', titleEn: 'TUES Talks', enSlug: 'tues-talks', summaryEn: 'Landing page describing the TUES Talks initiative and concept.' },
];

function splitFull(full) {
  const [section, leaf] = full.includes('/') ? full.split('/') : [full, null];
  return { section, leaf };
}

async function ensureSectionLocales() {
  const byLocaleIds = {}; // sectionKey -> { bg: id, en: id }
  for (const [key, def] of Object.entries(sections)) {
    byLocaleIds[key] = {};
    for (const locale of ['bg', 'en']) {
      const s = def.locales[locale];
      const data = {
        slug: s.slug,
        locale,
        title: s.title,
        navLabel: s.navLabel,
        excerpt: null,
        bodyMarkdown: null,
        blocks: null,
        published: true,
        parentId: null,
        order: 0,
        visible: true,
        externalUrl: null,
        routePath: null,
        routeOverride: null,
        accessRole: null,
        kind: 'FOLDER',
        groupId: def.groupId,
      };
      const up = await prisma.page.upsert({
        where: { slug_locale: { slug: s.slug, locale } },
        create: data,
        update: {
          title: data.title,
          navLabel: data.navLabel,
          kind: 'FOLDER',
          groupId: { set: def.groupId },
          parentId: { set: null },
        },
        select: { id: true },
      });
      byLocaleIds[key][locale] = up.id;
    }
  }
  return byLocaleIds;
}

async function seedPages() {
  console.log('Seeding static pages (bg/en)…');
  const sectionIds = await ensureSectionLocales();

  // Track orders per (locale, section)
  const orderCounters = new Map();
  function nextOrder(locale, sectionKey) {
    const k = `${locale}:${sectionKey}`;
    const v = orderCounters.get(k) ?? 0;
    orderCounters.set(k, v + 1);
    return v;
  }

  for (const item of items) {
    const { section, leaf } = splitFull(item.full);
    const sectionKey = section; // matches keys in sections
    if (!sections[sectionKey]) {
      throw new Error(`Unknown section '${sectionKey}' for '${item.full}'`);
    }

    // Create a groupId per logical page
    const pageGroupId = gid('G|page');

    // BG variant
    {
      const locale = 'bg';
      const parentId = sectionIds[sectionKey][locale];
      const slug = leaf ?? section; // leaf segment in bg
      const data = {
        slug,
        locale,
        title: item.titleBg,
        navLabel: item.titleBg,
        excerpt: null,
        bodyMarkdown: 'TODO: migrate full content from elsys-bg.org',
        blocks: null,
        published: true,
        parentId,
        order: nextOrder(locale, sectionKey),
        visible: true,
        externalUrl: null,
        routePath: null,
        routeOverride: null,
        accessRole: null,
        kind: 'PAGE',
        groupId: pageGroupId,
      };
      await prisma.page.upsert({
        where: { slug_locale: { slug, locale } },
        create: data,
        update: {
          title: data.title,
          navLabel: data.navLabel,
          parentId: { set: parentId },
          kind: 'PAGE',
          groupId: { set: pageGroupId },
          bodyMarkdown: { set: data.bodyMarkdown },
        },
      });
    }

    // EN variant
    {
      const locale = 'en';
      const parentId = sectionIds[sectionKey][locale];
      const slug = item.enSlug;
      const data = {
        slug,
        locale,
        title: item.titleEn,
        navLabel: item.titleEn,
        excerpt: item.summaryEn,
        bodyMarkdown: 'TODO: migrate full content from elsys-bg.org',
        blocks: null,
        published: true,
        parentId,
        order: nextOrder(locale, sectionKey),
        visible: true,
        externalUrl: null,
        routePath: null,
        routeOverride: null,
        accessRole: null,
        kind: 'PAGE',
        groupId: pageGroupId,
      };
      await prisma.page.upsert({
        where: { slug_locale: { slug, locale } },
        create: data,
        update: {
          title: data.title,
          navLabel: data.navLabel,
          parentId: { set: parentId },
          kind: 'PAGE',
          groupId: { set: pageGroupId },
          bodyMarkdown: { set: data.bodyMarkdown },
          excerpt: { set: data.excerpt },
        },
      });
    }
  }

  console.log('Static pages seeded.');
}

async function run() {
  try {
    await seedPages();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
