/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const prisma = new PrismaClient();

// --- TOTP 2FA test fixtures (G) -------------------------------------------
// Must match playwright.config TOTP_ENCRYPTION_KEY fallback + lib/totp format.
// Test/dev only — production sets a real TOTP_ENCRYPTION_KEY in env.
const TEST_TOTP_KEY = process.env.TOTP_ENCRYPTION_KEY || 'VbeDo/97t5ZKj36M3TlkM5pFLsyFCly/DGLOKH0bdWw=';
const TEST_2FA_SECRET = 'JBSWY3DPEHPK3PXP'; // base32; e2e computes TOTPs from this
const TEST_RECOVERY = ['aaaaa-bbbbb', 'ccccc-ddddd'];
function encryptTotpSecret(plain) {
  const key = Buffer.from(TEST_TOTP_KEY, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
}
const normRecovery = (c) => c.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@elsys.bg';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = 'Admin';

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hash, role: 'ADMIN' },
    create: { email, name, password: hash, role: 'ADMIN' },
  });

  console.log('Admin user ensured:', { id: user.id, email: user.email });

  // 2FA (G): mandatory for ADMIN. Enroll the bootstrap admin with a KNOWN secret
  // + recovery codes so e2e can compute valid TOTPs and exercise the gated flow.
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorSecret: encryptTotpSecret(TEST_2FA_SECRET), twoFactorEnrolledAt: new Date() },
  });
  await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: user.id } });
  for (const code of TEST_RECOVERY) {
    await prisma.twoFactorRecoveryCode.create({ data: { userId: user.id, codeHash: await bcrypt.hash(normRecovery(code), 10) } });
  }
  // Dedicated 2FA e2e admins (isolated so lockout/enroll mutations don't bleed):
  //   setup-admin  — un-enrolled, mandatory-gate test (read-only, never mutated)
  //   enroll-admin — un-enrolled, enrollment test (mutated; test cleans up)
  //   lockout-admin— enrolled (known secret), lockout test (locks only itself)
  const pw = await bcrypt.hash('admin123', 10);
  for (const email of ['setup-admin@elsys.bg', 'enroll-admin@elsys.bg']) {
    await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', twoFactorEnabled: false, twoFactorSecret: null, twoFactorEnrolledAt: null },
      create: { email, name: 'Setup Admin', role: 'ADMIN', password: pw },
    });
    await prisma.twoFactorRecoveryCode.deleteMany({ where: { user: { email } } });
  }
  const lockoutAdmin = await prisma.user.upsert({
    where: { email: 'lockout-admin@elsys.bg' },
    update: { role: 'ADMIN', twoFactorEnabled: true, twoFactorSecret: encryptTotpSecret(TEST_2FA_SECRET), twoFactorEnrolledAt: new Date() },
    create: { email: 'lockout-admin@elsys.bg', name: 'Lockout Admin', role: 'ADMIN', password: pw, twoFactorEnabled: true, twoFactorSecret: encryptTotpSecret(TEST_2FA_SECRET), twoFactorEnrolledAt: new Date() },
  });
  await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: lockoutAdmin.id } });
  console.log('✓ 2FA: enrolled bootstrap + lockout admins; un-enrolled setup + enroll admins');

  // Seed news articles
  const newsArticles = [
    {
      id: 'graduation-ceremony-2026',
      locale: 'bg',
      title: 'Успешна церемония по дипломиране на випуск 2026',
      excerpt: 'На 15 юни се състоя тържествена церемония по дипломиране на завършващия випуск от ТУЕС',
      bodyMarkdown: `# Церемония по дипломиране

На 15 юни 2026 година се състоя тържествена церемония по дипломиране на випуск 2026 от Технологично училище "Електронни системи" към ТУ-София.

## Постиженията на випуска

Завършващите ученици демонстрираха изключителни постижения в областта на софтуерните технологии и електронните системи. Повече от 85% от випускниците вече имат предложения за работа от водещи технологични компании.

## Награди и отличия

Специални награди получиха отличниците, както и ученици, отличили се с принос към училищната общност и с изключителни проекти.

Поздравяваме всички завършващи и им пожелаваме успешна реализация!`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'Церемония по дипломиране', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'На 15 юни 2026 година се състоя тържествена церемония по дипломиране на випуск 2026 от Технологично училище "Електронни системи" към ТУ-София.' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Постиженията на випуска', level: 'h3' } },
        { id: 'blk-4', type: 'Paragraph', props: { content: 'Завършващите ученици демонстрираха изключителни постижения в областта на софтуерните технологии и електронните системи. Повече от 85% от випускниците вече имат предложения за работа от водещи технологични компании.' } },
        { id: 'blk-5', type: 'Heading', props: { text: 'Награди и отличия', level: 'h3' } },
        { id: 'blk-6', type: 'Paragraph', props: { content: 'Специални награди получиха отличниците, както и ученици, отличили се с принос към училищната общност и с изключителни проекти.' } },
        { id: 'blk-7', type: 'Callout', props: { type: 'success', title: 'Поздравления', content: 'Поздравяваме всички завършващи и им пожелаваме успешна реализация!' } },
      ],
      useBlocks: true,
      date: new Date('2026-06-15'),
      featuredImage: '/images/news/graduation-2026.svg',
      published: true,
    },
    {
      id: 'graduation-ceremony-2026',
      locale: 'en',
      title: 'Successful Graduation Ceremony 2026',
      excerpt: 'The graduation ceremony for the class of 2026 took place on June 15th at ELSYS',
      bodyMarkdown: `# Graduation Ceremony

On June 15, 2026, the graduation ceremony for the class of 2026 from the Technological School of Electronic Systems at Technical University - Sofia took place.

## Class Achievements

The graduating students demonstrated exceptional achievements in software technologies and electronic systems. Over 85% of graduates already have job offers from leading tech companies.

## Awards and Honors

Special awards were given to honor students and those who contributed to the school community with outstanding projects.

Congratulations to all graduates and best wishes for successful careers!`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'Graduation Ceremony', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'On June 15, 2026, the graduation ceremony for the class of 2026 from the Technological School of Electronic Systems at Technical University - Sofia took place.' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Class Achievements', level: 'h3' } },
        { id: 'blk-4', type: 'Paragraph', props: { content: 'The graduating students demonstrated exceptional achievements in software technologies and electronic systems. Over 85% of graduates already have job offers from leading tech companies.' } },
        { id: 'blk-5', type: 'Heading', props: { text: 'Awards and Honors', level: 'h3' } },
        { id: 'blk-6', type: 'Paragraph', props: { content: 'Special awards were given to honor students and those who contributed to the school community with outstanding projects.' } },
        { id: 'blk-7', type: 'Callout', props: { type: 'success', title: 'Congratulations', content: 'Congratulations to all graduates and best wishes for successful careers!' } },
      ],
      useBlocks: true,
      date: new Date('2026-06-15'),
      featuredImage: '/images/news/graduation-2026.svg',
      published: true,
    },
    {
      id: 'hackathon-winners-2026',
      locale: 'bg',
      title: 'Ученици от ТУЕС спечелиха национален хакатон',
      excerpt: 'Екип от 11 клас завоюва първо място на National Code Challenge 2026',
      bodyMarkdown: `# Победа на национален хакатон

Екип от трима ученици от 11 клас на ТУЕС завоюва първо място на престижния National Code Challenge 2026.

## Проектът

Младите програмисти разработиха иновативна платформа за управление на градски транспорт в реално време, която използва AI за оптимизация на маршрутите.

## Награди

Освен паричната награда от 5000 лева, победителите получиха стипендии за участие в международни технологични конференции и менторство от водещи софтуерни инженери.`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'Победа на национален хакатон', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'Екип от трима ученици от 11 клас на ТУЕС завоюва първо място на престижния National Code Challenge 2026.' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Проектът', level: 'h3' } },
        { id: 'blk-4', type: 'Paragraph', props: { content: 'Младите програмисти разработиха иновативна платформа за управление на градски транспорт в реално време, която използва AI за оптимизация на маршрутите.' } },
        { id: 'blk-5', type: 'Heading', props: { text: 'Награди', level: 'h3' } },
        { id: 'blk-6', type: 'List', props: { style: 'bullet', items: [
          { text: 'Парична награда от 5000 лева' },
          { text: 'Стипендии за международни технологични конференции' },
          { text: 'Менторство от водещи софтуерни инженери' }
        ]}},
      ],
      useBlocks: true,
      date: new Date('2026-05-20'),
      featuredImage: '/images/news/hackathon-2026.svg',
      published: true,
    },
    {
      id: 'hackathon-winners-2026',
      locale: 'en',
      title: 'ELSYS Students Win National Hackathon',
      excerpt: 'An 11th grade team won first place at National Code Challenge 2026',
      bodyMarkdown: `# National Hackathon Victory

A team of three 11th grade students from ELSYS won first place at the prestigious National Code Challenge 2026.

## The Project

The young programmers developed an innovative real-time urban transport management platform that uses AI to optimize routes.

## Awards

In addition to the cash prize of 5,000 BGN, the winners received scholarships to attend international tech conferences and mentorship from leading software engineers.`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'National Hackathon Victory', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'A team of three 11th grade students from ELSYS won first place at the prestigious National Code Challenge 2026.' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'The Project', level: 'h3' } },
        { id: 'blk-4', type: 'Paragraph', props: { content: 'The young programmers developed an innovative real-time urban transport management platform that uses AI to optimize routes.' } },
        { id: 'blk-5', type: 'Heading', props: { text: 'Awards', level: 'h3' } },
        { id: 'blk-6', type: 'List', props: { style: 'bullet', items: [
          { text: 'Cash prize of 5,000 BGN' },
          { text: 'Scholarships for international tech conferences' },
          { text: 'Mentorship from leading software engineers' }
        ]}},
      ],
      useBlocks: true,
      date: new Date('2026-05-20'),
      featuredImage: '/images/news/hackathon-2026.svg',
      published: true,
    },
    {
      id: 'new-laboratory-opening',
      locale: 'bg',
      title: 'Откриване на нова лаборатория по роботика',
      excerpt: 'ТУЕС откри модерна лаборатория по роботика и изкуствен интелект',
      bodyMarkdown: `# Нова лаборатория по роботика

На 10 април ТУЕС официално откри най-модерната лаборатория по роботика и изкуствен интелект в България.

## Оборудване

Лабораторията е оборудвана с:
- 20 роботизирани комплекта за обучение
- VR системи за симулация
- 3D принтери
- Специализиран софтуер за моделиране

## Партньори

Проектът беше реализиран с подкрепата на водещи технологични компании и Техническия университет - София.`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'Нова лаборатория по роботика', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'На 10 април ТУЕС официално откри най-модерната лаборатория по роботика и изкуствен интелект в България.' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Оборудване', level: 'h3' } },
        { id: 'blk-4', type: 'List', props: { style: 'check', items: [
          { text: '20 роботизирани комплекта за обучение' },
          { text: 'VR системи за симулация' },
          { text: '3D принтери' },
          { text: 'Специализиран софтуер за моделиране' }
        ]}},
        { id: 'blk-5', type: 'Heading', props: { text: 'Партньори', level: 'h3' } },
        { id: 'blk-6', type: 'Paragraph', props: { content: 'Проектът беше реализиран с подкрепата на водещи технологични компании и Техническия университет - София.' } },
      ],
      useBlocks: true,
      date: new Date('2026-04-10'),
      featuredImage: '/images/news/robotics-lab.svg',
      published: true,
    },
    {
      id: 'new-laboratory-opening',
      locale: 'en',
      title: 'Opening of New Robotics Laboratory',
      excerpt: 'ELSYS opened a modern robotics and artificial intelligence laboratory',
      bodyMarkdown: `# New Robotics Laboratory

On April 10, ELSYS officially opened Bulgaria's most modern robotics and artificial intelligence laboratory.

## Equipment

The laboratory is equipped with:
- 20 educational robotics kits
- VR simulation systems
- 3D printers
- Specialized modeling software

## Partners

The project was realized with the support of leading tech companies and the Technical University - Sofia.`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'New Robotics Laboratory', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'On April 10, ELSYS officially opened Bulgaria\'s most modern robotics and artificial intelligence laboratory.' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Equipment', level: 'h3' } },
        { id: 'blk-4', type: 'List', props: { style: 'check', items: [
          { text: '20 educational robotics kits' },
          { text: 'VR simulation systems' },
          { text: '3D printers' },
          { text: 'Specialized modeling software' }
        ]}},
        { id: 'blk-5', type: 'Heading', props: { text: 'Partners', level: 'h3' } },
        { id: 'blk-6', type: 'Paragraph', props: { content: 'The project was realized with the support of leading tech companies and the Technical University - Sofia.' } },
      ],
      useBlocks: true,
      date: new Date('2026-04-10'),
      featuredImage: '/images/news/robotics-lab.svg',
      published: true,
    },
    {
      id: 'international-olympiad-medals',
      locale: 'bg',
      title: 'Медали от международна олимпиада по информатика',
      excerpt: 'Трима ученици спечелиха медали на международната олимпиада в Токио',
      bodyMarkdown: `# Международен успех

Три ученици от ТУЕС се завърнаха с медали от Международната олимпиада по информатика, проведена в Токио, Япония.

## Резултати

- Златен медал - Иван Петров, 12 клас
- Сребърен медал - Мария Димитрова, 11 клас
- Бронзов медал - Георги Стоянов, 11 клас

## Подготовка

Учениците се подготвяха под ръководството на опитни преподаватели и с подкрепата на alumni мрежата на училището.`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'Международен успех', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'Три ученици от ТУЕС се завърнаха с медали от Международната олимпиада по информатика, проведена в Токио, Япония.' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Резултати', level: 'h3' } },
        { id: 'blk-4', type: 'List', props: { style: 'numbered', items: [
          { text: 'Златен медал - Иван Петров, 12 клас' },
          { text: 'Сребърен медал - Мария Димитрова, 11 клас' },
          { text: 'Бронзов медал - Георги Стоянов, 11 клас' }
        ]}},
        { id: 'blk-5', type: 'Quote', props: { text: 'Учениците се подготвяха под ръководството на опитни преподаватели и с подкрепата на alumni мрежата на училището.', style: 'highlighted' } },
      ],
      useBlocks: true,
      date: new Date('2026-03-15'),
      featuredImage: '/images/news/olympiad-medals.svg',
      published: true,
    },
    {
      id: 'international-olympiad-medals',
      locale: 'en',
      title: 'Medals from International Informatics Olympiad',
      excerpt: 'Three students won medals at the international olympiad in Tokyo',
      bodyMarkdown: `# International Success

Three students from ELSYS returned with medals from the International Informatics Olympiad held in Tokyo, Japan.

## Results

- Gold medal - Ivan Petrov, 12th grade
- Silver medal - Maria Dimitrova, 11th grade
- Bronze medal - Georgi Stoyanov, 11th grade

## Preparation

Students were trained under the guidance of experienced teachers and with the support of the school's alumni network.`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'International Success', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'Three students from ELSYS returned with medals from the International Informatics Olympiad held in Tokyo, Japan.' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Results', level: 'h3' } },
        { id: 'blk-4', type: 'List', props: { style: 'numbered', items: [
          { text: 'Gold medal - Ivan Petrov, 12th grade' },
          { text: 'Silver medal - Maria Dimitrova, 11th grade' },
          { text: 'Bronze medal - Georgi Stoyanov, 11th grade' }
        ]}},
        { id: 'blk-5', type: 'Quote', props: { text: 'Students were trained under the guidance of experienced teachers and with the support of the school\'s alumni network.', style: 'highlighted' } },
      ],
      useBlocks: true,
      date: new Date('2026-03-15'),
      featuredImage: '/images/news/olympiad-medals.svg',
      published: true,
    },
    {
      id: 'open-doors-day-spring',
      locale: 'bg',
      title: 'Ден на отворените врати - пролет 2026',
      excerpt: 'Поканете се на деня на отворените врати на 25 март за да опознаете ТУЕС',
      bodyMarkdown: `# Ден на отворените врати

На 25 март ви каним на Ден на отворените врати в ТУЕС!

## Програма

- 10:00 - Официално откриване и презентация на училището
- 11:00 - Разходка из лабораториите
- 12:00 - Демонстрации на ученически проекти
- 13:00 - Среща с преподаватели и ученици
- 14:00 - Въпроси и отговори

## Регистрация

Регистрацията е задължителна. Моля запишете се онлайн до 20 март.

Очакваме ви!`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'Ден на отворените врати', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'На 25 март ви каним на Ден на отворените врати в ТУЕС!' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Програма', level: 'h3' } },
        { id: 'blk-4', type: 'List', props: { style: 'numbered', items: [
          { text: '10:00 - Официално откриване и презентация на училището' },
          { text: '11:00 - Разходка из лабораториите' },
          { text: '12:00 - Демонстрации на ученически проекти' },
          { text: '13:00 - Среща с преподаватели и ученици' },
          { text: '14:00 - Въпроси и отговори' }
        ]}},
        { id: 'blk-5', type: 'Callout', props: { type: 'info', title: 'Регистрация', content: 'Регистрацията е задължителна. Моля запишете се онлайн до 20 март. Очакваме ви!' } },
      ],
      useBlocks: true,
      date: new Date('2026-02-20'),
      featuredImage: '/images/news/open-doors.svg',
      published: true,
    },
    {
      id: 'open-doors-day-spring',
      locale: 'en',
      title: 'Open Doors Day - Spring 2026',
      excerpt: 'Join us on March 25th to get to know ELSYS',
      bodyMarkdown: `# Open Doors Day

On March 25th, we invite you to the ELSYS Open Doors Day!

## Program

- 10:00 AM - Official opening and school presentation
- 11:00 AM - Laboratory tour
- 12:00 PM - Student project demonstrations
- 1:00 PM - Meet with teachers and students
- 2:00 PM - Q&A session

## Registration

Registration is required. Please register online by March 20th.

We look forward to seeing you!`,
      blocks: [
        { id: 'blk-1', type: 'Heading', props: { text: 'Open Doors Day', level: 'h2' } },
        { id: 'blk-2', type: 'Paragraph', props: { content: 'On March 25th, we invite you to the ELSYS Open Doors Day!' } },
        { id: 'blk-3', type: 'Heading', props: { text: 'Program', level: 'h3' } },
        { id: 'blk-4', type: 'List', props: { style: 'numbered', items: [
          { text: '10:00 AM - Official opening and school presentation' },
          { text: '11:00 AM - Laboratory tour' },
          { text: '12:00 PM - Student project demonstrations' },
          { text: '1:00 PM - Meet with teachers and students' },
          { text: '2:00 PM - Q&A session' }
        ]}},
        { id: 'blk-5', type: 'Callout', props: { type: 'info', title: 'Registration', content: 'Registration is required. Please register online by March 20th. We look forward to seeing you!' } },
      ],
      useBlocks: true,
      date: new Date('2026-02-20'),
      featuredImage: '/images/news/open-doors.svg',
      published: true,
    },
    {
      id: 'tech-company-partnership',
      locale: 'bg',
      title: 'Ново партньорство с водеща софтуерна компания',
      excerpt: 'ТУЕС подписа договор за сътрудничество с международна технологична компания',
      bodyMarkdown: `# Стратегическо партньорство

ТУЕС подписа договор за дългосрочно партньорство с водеща международна софтуерна компания.

## Ползи за учениците

Партньорството включва:
- Летни стажантски програми
- Менторство от индустриални експерти
- Достъп до модерни технологии и инструменти
- Възможности за кариерно развитие

## Общи проекти

Компанията ще подкрепя развитието на специализирани курсове и ще предоставя реални проекти за учениците.`,
      blocks: [],
      useBlocks: true,
      date: new Date('2026-02-05'),
      featuredImage: '/images/news/partnership.svg',
      published: true,
    },
    {
      id: 'tech-company-partnership',
      locale: 'en',
      title: 'New Partnership with Leading Software Company',
      excerpt: 'ELSYS signed a cooperation agreement with an international tech company',
      bodyMarkdown: `# Strategic Partnership

ELSYS signed a long-term partnership agreement with a leading international software company.

## Benefits for Students

The partnership includes:
- Summer internship programs
- Mentorship from industry experts
- Access to modern technologies and tools
- Career development opportunities

## Joint Projects

The company will support the development of specialized courses and provide real projects for students.`,
      blocks: [],
      useBlocks: true,
      date: new Date('2026-02-05'),
      featuredImage: '/images/news/partnership.svg',
      published: true,
    },
    {
      id: 'sports-tournament-victory',
      locale: 'bg',
      title: 'Спортна победа на училищния отбор',
      excerpt: 'Футболният отбор на ТУЕС спечели междуучилищния турнир',
      bodyMarkdown: `# Спортен успех

Футболният отбор на ТУЕС спечели престижния междуучилищен турнир "София Къп 2026".

## Финалът

В драматичен финал нашите момчета победиха отбора на СМГ с резултат 3:2.

## Отборът

Поздравяваме целия отбор, треньорите и всички които подкрепиха нашите спортисти!

ТУЕС не е само код и електроника - тук развиваме и спортния дух!`,
      blocks: [],
      useBlocks: true,
      date: new Date('2026-01-25'),
      featuredImage: '/images/news/football-victory.svg',
      published: true,
    },
    {
      id: 'sports-tournament-victory',
      locale: 'en',
      title: 'Sports Victory for School Team',
      excerpt: 'ELSYS football team won the inter-school tournament',
      bodyMarkdown: `# Sports Success

The ELSYS football team won the prestigious inter-school tournament "Sofia Cup 2026".

## The Final

In a dramatic final, our boys defeated the SMG team with a score of 3:2.

## The Team

Congratulations to the entire team, coaches, and everyone who supported our athletes!

ELSYS is not just code and electronics - we develop sportsmanship too!`,
      blocks: [],
      useBlocks: true,
      date: new Date('2026-01-25'),
      featuredImage: '/images/news/football-victory.svg',
      published: true,
    },
    {
      id: 'alumni-meetup-january',
      locale: 'bg',
      title: 'Среща с alumni - януари 2026',
      excerpt: 'Успешна среща с випускници, работещи в международни компании',
      bodyMarkdown: `# Alumni среща

На 12 януари се състоя поредната среща с випускници на ТУЕС.

## Гости

Сред гостите бяха:
- Петър Георгиев - Senior Software Engineer в Google
- Анна Михайлова - Data Scientist в Microsoft
- Стефан Николов - CTO на български стартъп

## Теми

Випускниците споделиха своя опит от работата в индустрията, дадоха съвети на настоящите ученици и отговориха на въпроси за кариерно развитие.

## Следваща среща

Следващата alumni среща се планира за май 2026.`,
      blocks: [],
      useBlocks: true,
      date: new Date('2026-01-12'),
      featuredImage: '/images/news/alumni-meetup.svg',
      published: true,
    },
    {
      id: 'alumni-meetup-january',
      locale: 'en',
      title: 'Alumni Meetup - January 2026',
      excerpt: 'Successful meetup with graduates working in international companies',
      bodyMarkdown: `# Alumni Meetup

On January 12, another ELSYS alumni meetup took place.

## Guests

Among the guests were:
- Petar Georgiev - Senior Software Engineer at Google
- Anna Mihaylova - Data Scientist at Microsoft
- Stefan Nikolov - CTO of a Bulgarian startup

## Topics

The alumni shared their industry experience, gave advice to current students, and answered questions about career development.

## Next Meetup

The next alumni meetup is planned for May 2026.`,
      blocks: [],
      useBlocks: true,
      date: new Date('2026-01-12'),
      featuredImage: '/images/news/alumni-meetup.svg',
      published: true,
    },
    {
      id: 'coding-workshop-series',
      locale: 'bg',
      title: 'Нова серия от coding workshops',
      excerpt: 'Стартира поредица от специализирани workshops по съвременни технологии',
      bodyMarkdown: `# Coding Workshops 2026

През февруари стартира нова серия от workshops по актуални теми в софтуерното инженерство.

## Теми

- Web3 и blockchain технологии
- Machine Learning основи
- Cloud-native разработка
- Mobile development с Flutter
- Game development

## Формат

Всеки workshop включва теоретична част и практически проект. Участието е безплатно за ученици от ТУЕС.

## Регистрация

Регистрацията за първия workshop е вече отворена!`,
      blocks: [],
      useBlocks: true,
      date: new Date('2026-01-08'),
      featuredImage: '/images/news/workshops.svg',
      published: true,
    },
    {
      id: 'coding-workshop-series',
      locale: 'en',
      title: 'New Series of Coding Workshops',
      excerpt: 'A series of specialized workshops on modern technologies is starting',
      bodyMarkdown: `# Coding Workshops 2026

A new series of workshops on current topics in software engineering starts in February.

## Topics

- Web3 and blockchain technologies
- Machine Learning basics
- Cloud-native development
- Mobile development with Flutter
- Game development

## Format

Each workshop includes a theoretical part and a practical project. Participation is free for ELSYS students.

## Registration

Registration for the first workshop is now open!`,
      blocks: [],
      useBlocks: true,
      date: new Date('2026-01-08'),
      featuredImage: '/images/news/workshops.svg',
      published: true,
    },
  ];

  console.log('Seeding news articles...');

  // E2: category chip + colour for a few posts (bg/en labels) so the NewsCard
  // Badge and the /novini category filter render with real data.
  const newsCategory = {
    'graduation-ceremony-2026': { colorTag: 'BLUE', bg: 'Събитие', en: 'Event' },
    'hackathon-winners-2026': { colorTag: 'GREEN', bg: 'Успех', en: 'Achievement' },
    'international-olympiad-medals': { colorTag: 'ORANGE', bg: 'Награди', en: 'Awards' },
    'new-laboratory-opening': { colorTag: 'PURPLE', bg: 'Новина', en: 'News' },
    'open-doors-day-spring': { colorTag: 'BLUE', bg: 'Събитие', en: 'Event' },
  };

  // Track which slugs we've created version 1 for (to avoid duplicates)
  const seededVersions = new Set();

  for (const article of newsArticles) {
    // Dual-write status (R3): boolean -> PublishStatus. Scheduling stays date-encoded.
    const article2 = { ...article, status: article.published === false ? 'DRAFT' : 'PUBLISHED' };
    const cat = newsCategory[article.id];
    if (cat) {
      article2.colorTag = cat.colorTag;
      article2.category = article.locale === 'en' ? cat.en : cat.bg;
    }
    await prisma.newsPost.upsert({
      where: {
        id_locale: {
          id: article.id,
          locale: article.locale
        }
      },
      update: article2,
      create: { ...article2, authorId: user.id },
    });

    // Create version 1 only once per slug (shared across all locales)
    if (!seededVersions.has(article.id)) {
      try {
        // Check if version already exists
        const existingVersion = await prisma.newsPostVersion.findFirst({
          where: {
            newsPostId: article.id,
            version: 1,
          },
        });

        if (!existingVersion) {
          await prisma.newsPostVersion.create({
            data: {
              newsPostId: article.id,
              version: 1,
              title: article.title,
              excerpt: article.excerpt || null,
              bodyMarkdown: article.bodyMarkdown,
              blocks: article.blocks || null,
              useBlocks: article.useBlocks,
              date: article.date,
              images: null,
              featuredImage: article.featuredImage || null,
              published: article.published,
              createdById: user.id,
            },
          });
        }
        seededVersions.add(article.id);
      } catch (error) {
        console.error(`Failed to create version for ${article.id}:`, error.message);
      }
    }
  }

  console.log(`✓ Seeded ${newsArticles.length} news articles (${newsArticles.length / 2} unique articles in 2 languages)`);
  console.log(`✓ Created version 1 for ${seededVersions.size} unique articles`);

  // Seed carousel slides
  const carouselSlides = [
    {
      id: 'carousel-admission-2026-bg',
      locale: 'bg',
      title: 'Прием 2026 — Кандидатствай за ТУЕС',
      subtitle: 'Водещото технологично училище в България. Специалности: Компютърни мрежи, Изкуствен интелект, Системно програмиране.',
      imageDesktop: '/images/carousel/admission-2026.svg',
      linkUrl: '/bg/priem',
      linkLabel: 'Научи повече',
      status: 'PUBLISHED',
      order: 1,
    },
    {
      id: 'carousel-hack-tues-2026-bg',
      locale: 'bg',
      title: 'Hack TUES 2026',
      subtitle: 'Годишният hackathon на ТУЕС. 48 часа, неограничени идеи, реални решения.',
      imageDesktop: '/images/carousel/hack-tues.svg',
      linkUrl: '/bg/uchenicheski-jivot/hack-tues',
      linkLabel: 'Виж повече',
      status: 'PUBLISHED',
      order: 2,
    },
  ];

  for (const slide of carouselSlides) {
    await prisma.carousel.upsert({
      where: { id: slide.id },
      update: slide,
      create: { ...slide, authorId: user.id },
    });
  }

  console.log(`✓ Seeded ${carouselSlides.length} carousel slides`);

  // Seed student clubs
  const clubs = [
    {
      id: 'club-roboklub-bg',
      locale: 'bg',
      slug: 'roboklub',
      title: 'Роботика и автоматизация',
      description: 'Сглобяване и програмиране на роботи, подготовка за състезания по роботика.',
      color: 'BLUE',
      meetingSchedule: 'Всеки вторник, 16:00 — лаборатория 304',
      contactEmail: 'roboklub@elsys-bg.org',
      status: 'PUBLISHED',
      order: 1,
    },
    {
      id: 'club-competitive-programming-bg',
      locale: 'bg',
      slug: 'sustezatelno-programirane',
      title: 'Състезателно програмиране',
      description: 'Алгоритми, структури от данни и подготовка за олимпиади по информатика.',
      color: 'GREEN',
      meetingSchedule: 'Всеки четвъртък, 15:30 — кабинет 210',
      contactEmail: 'cp@elsys-bg.org',
      status: 'PUBLISHED',
      order: 2,
    },
    {
      id: 'club-foto-bg',
      locale: 'bg',
      slug: 'fotografski-klub',
      title: 'Фотографски клуб',
      description: 'Композиция, обработка и документиране на училищния живот.',
      color: 'PURPLE',
      meetingSchedule: 'Всеки петък, 14:00 — медиен център',
      contactEmail: 'foto@elsys-bg.org',
      status: 'DRAFT',
      order: 3,
    },
  ];

  for (const club of clubs) {
    await prisma.club.upsert({
      where: { slug_locale: { slug: club.slug, locale: club.locale } },
      update: club,
      create: { ...club, authorId: user.id },
    });
  }

  console.log(`✓ Seeded ${clubs.length} student clubs`);

  // Top-level header navigation (7 roots). The header builds from Page rows
  // (lib/navigation-build.ts → label = navLabel ?? slug), so each root needs a
  // navLabel in BOTH locales or it renders its raw slug (Phase-C flag). Slugs
  // mirror lib/nav.ts canonical paths so links resolve where the section page
  // exists (Новини → /novini via the E1 route, Блог → /blog). Top-level only;
  // dropdown children seed in a later phase. Sections without a built content
  // page (priem/obuchenie/uchilishteto/uchenicheski-zhivot/evroproekti) render
  // an empty placeholder until E2/E3 — expected.
  const navRoots = [
    { slug: "novini", order: 1, bg: "Новини", en: "News" },
    { slug: "priem", order: 2, bg: "Прием", en: "Admissions" },
    { slug: "obuchenie", order: 3, bg: "Обучение", en: "Education" },
    { slug: "uchilishteto", order: 4, bg: "Училището", en: "The School" },
    { slug: "uchenicheski-zhivot", order: 5, bg: "Ученически живот", en: "Student Life" },
    { slug: "blog", order: 6, bg: "Блог", en: "Blog" },
    { slug: "evroproekti", order: 7, bg: "Евро проекти", en: "EU Projects" },
  ];
  for (const root of navRoots) {
    for (const locale of ["bg", "en"]) {
      const data = {
        slug: root.slug,
        locale,
        title: locale === "bg" ? root.bg : root.en,
        navLabel: locale === "bg" ? root.bg : root.en,
        visible: true,
        order: root.order,
        published: true,
        status: "PUBLISHED",
        kind: "PAGE",
      };
      await prisma.page.upsert({
        where: { slug_locale: { slug: root.slug, locale } },
        update: data,
        create: { ...data, authorId: user.id },
      });
    }
  }
  console.log(`✓ Seeded ${navRoots.length} top-level nav roots (bg + en)`);

  // Seed a page + a kind=ROUTE alias that points at it.
  // This is living documentation of the ROUTE alias feature AND the fixture the
  // route-alias e2e relies on (CI seeds the DB, so the test can't depend on
  // dev-machine state). /bg/za-nas/za-uchilishteto resolves to the same content
  // as the canonical /bg/za-uchilishteto via lib/routes.ts.
  const pages = [
    {
      slug: 'za-uchilishteto',
      locale: 'bg',
      title: 'За училището',
      bodyMarkdown: 'ТУЕС е водещо технологично училище в България.',
      published: true,
      status: 'PUBLISHED',
      kind: 'PAGE',
    },
    {
      // ROUTE alias node: routeOverride "za-nas" -> routePath "[...slug]"
      // (catch-all). The remainder of the URL becomes the resolved target path.
      slug: 'za-uchilishteto-route',
      locale: 'bg',
      title: 'За училището (route alias)',
      navLabel: 'За нас',
      published: true,
      status: 'PUBLISHED',
      visible: true,
      kind: 'ROUTE',
      routeOverride: 'za-nas',
      routePath: '[...slug]',
    },
    {
      // R3 fixture: a DRAFT page must 404 publicly but still list in admin.
      slug: 'chernova-stranica',
      locale: 'bg',
      title: 'Чернова страница',
      bodyMarkdown: 'Това е чернова и не трябва да е видима публично.',
      published: false,
      status: 'DRAFT',
      kind: 'PAGE',
    },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug_locale: { slug: page.slug, locale: page.locale } },
      update: page,
      create: { ...page, authorId: user.id },
    });
  }

  console.log(`✓ Seeded ${pages.length} pages (incl. 1 ROUTE alias, 1 draft)`);

  // E2: block-composed content for the flagship CMS pages (About + Admissions),
  // replacing the title-only placeholders. Inline static content for team /
  // partners / documents — TODO: source from Staff/Partner/Document models.
  const contentPages = [
    {
      slug: 'za-uchilishteto',
      locale: 'bg',
      title: 'За училището',
      excerpt: 'Водещото технологично училище в България от 1991 г.',
      published: true,
      status: 'PUBLISHED',
      kind: 'PAGE',
      bodyMarkdown: '',
      blocks: [
        { type: 'Section', props: { title: 'Кои сме', highlight: 'ние', markdown: 'Технологично училище „Електронни системи“ (ТУЕС) към Техническия университет — София е водещо професионално училище в сферата на компютърните технологии и електрониката. Основано през 1991 г., то подготвя поколения софтуерни инженери, мрежови специалисти и иноватори.' } },
        { type: 'Stats', props: { items: [
          { value: '1991', label: 'Година на основаване' },
          { value: '2000+', label: 'Възпитаници' },
          { value: '50+', label: 'Преподаватели' },
          { value: '95%', label: 'Реализация' },
        ] } },
        { type: 'TeamGrid', props: { title: 'Преподавателски екип', items: [
          { name: 'инж. Иван Петров', role: 'Компютърни мрежи', email: 'ipetrov@elsys-bg.org' },
          { name: 'Мария Георгиева', role: 'Програмиране' },
          { name: 'д-р Стоян Колев', role: 'Системно програмиране' },
          { name: 'Елена Димитрова', role: 'Електроника' },
        ] } },
        { type: 'PartnerGrid', props: { title: 'Партньори', items: [
          { name: 'ТУ-София', logo: '/images/logo.svg', href: 'https://tu-sofia.bg' },
          { name: 'Партньор', logo: '/images/logo.svg' },
          { name: 'Партньор', logo: '/images/logo.svg' },
          { name: 'Партньор', logo: '/images/logo.svg' },
        ] } },
      ],
    },
    {
      slug: 'priem',
      locale: 'bg',
      title: 'Прием',
      excerpt: 'Кандидатствай за ТУЕС след завършен 7. клас.',
      navLabel: 'Прием',
      visible: true,
      order: 2,
      published: true,
      status: 'PUBLISHED',
      kind: 'PAGE',
      bodyMarkdown: '',
      blocks: [
        { type: 'Section', props: { title: 'Прием в', highlight: 'ТУЕС', markdown: 'Приемът в ТУЕС се извършва след завършен 7. клас въз основа на резултатите от Националното външно оценяване. Следвайте стъпките по-долу и подгответе необходимите документи.' } },
        { type: 'AdmissionsTimeline', props: { title: 'Стъпки за кандидатстване', steps: [
          { title: 'Национално външно оценяване', date: 'Юни', description: 'Явете се на изпитите по математика и български език.' },
          { title: 'Подаване на документи', date: 'Юли', description: 'Подайте заявление онлайн или на място в училището.' },
          { title: 'Класиране', date: 'Юли', description: 'Класирането се извършва по бал съгласно държавния план-прием.' },
          { title: 'Записване', date: 'Септември', description: 'Записване на приетите ученици с оригинални документи.' },
        ] } },
        { type: 'DocumentList', props: { title: 'Необходими документи', items: [
          { name: 'Заявление за кандидатстване.pdf', href: '/docs/zayavlenie.pdf', fileType: 'PDF', size: '120 KB' },
          { name: 'Правилник за прием 2026.pdf', href: '/docs/pravilnik-priem.pdf', fileType: 'PDF', size: '1.4 MB' },
        ] } },
        { type: 'CTA', props: { title: 'Готови ли сте да станете част от ТУЕС?', description: 'Запознайте се с условията и важните дати за прием 2026.', primaryButton: { label: 'Кандидатствай', href: '/priem' }, secondaryButton: { label: 'Контакти', href: '/uchilishteto/kontakti' } } },
      ],
    },
    {
      // Clubs listing (E3) — CMS-block page (no Club model). TODO: Club model.
      slug: 'klubove',
      locale: 'bg',
      title: 'Клубове и дейности',
      excerpt: 'Извънкласните занимания в ТУЕС — място за приятелства, проекти и страст към технологиите.',
      published: true,
      status: 'PUBLISHED',
      kind: 'PAGE',
      bodyMarkdown: '',
      blocks: [
        { type: 'ClubGrid', props: { items: [
          { name: 'Роботика', description: 'Състезателна робототехника и автоматизация.', color: 'TEAL', href: '/uchenicheski-zhivot/klubove' },
          { name: 'Олимпийци', description: 'Подготовка за национални и международни олимпиади.', color: 'BLUE' },
          { name: 'Дебати', description: 'Реторика, критично мислене и публично говорене.', color: 'PURPLE' },
          { name: 'ТУЕС Медиа', description: 'Видео, подкасти и училищна журналистика.', color: 'RED' },
          { name: 'Гейм дев', description: 'Разработка на игри и интерактивни преживявания.', color: 'ORANGE' },
          { name: 'Предприемачество', description: 'Стартъп идеи, питчинг и работа с ментори.', color: 'GREEN' },
        ] } },
      ],
    },
    {
      // Documents listing (E3) — grouped DocumentList blocks. TODO: Document model + Blob.
      slug: 'dokumenti',
      locale: 'bg',
      title: 'Документи',
      excerpt: 'Заявления, правилници и бланки за изтегляне.',
      published: true,
      status: 'PUBLISHED',
      kind: 'PAGE',
      bodyMarkdown: '',
      blocks: [
        { type: 'DocumentList', props: { title: 'Прием 2026', items: [
          { name: 'Заявление за кандидатстване.pdf', href: '/docs/zayavlenie.pdf', fileType: 'PDF', size: '120 KB' },
          { name: 'Балообразуване и профили.pdf', href: '/docs/baloobrazuvane.pdf', fileType: 'PDF', size: '1.4 MB' },
          { name: 'График на дейностите.pdf', href: '/docs/grafik-priem.pdf', fileType: 'PDF', size: '320 KB' },
        ] } },
        { type: 'DocumentList', props: { title: 'Правилници', items: [
          { name: 'Правилник за дейността на училището.pdf', href: '/docs/pravilnik.pdf', fileType: 'PDF', size: '1.4 MB' },
          { name: 'Етичен кодекс.pdf', href: '/docs/etichen-kodeks.pdf', fileType: 'PDF', size: '210 KB' },
          { name: 'Правила за ползване на лаборатории.pdf', href: '/docs/laboratorii.pdf', fileType: 'PDF', size: '180 KB' },
        ] } },
        { type: 'DocumentList', props: { title: 'Бланки', items: [
          { name: 'Бланка за отсъствие.docx', href: '/docs/otsastvie.docx', fileType: 'DOCX', size: '40 KB' },
          { name: 'Заявление за уверение.docx', href: '/docs/uverenie.docx', fileType: 'DOCX', size: '38 KB' },
        ] } },
      ],
    },
  ];

  for (const page of contentPages) {
    await prisma.page.upsert({
      where: { slug_locale: { slug: page.slug, locale: page.locale } },
      update: page,
      create: { ...page, authorId: user.id },
    });
  }
  console.log(`✓ Seeded ${contentPages.length} block-composed content pages (About, Admissions)`);

  // ---------------------------------------------------------------------------
  // H: footer-linked legal pages (/poveritelnost, /biskvitki, /dostapnost).
  // EU public-sector compliance pages. These are STRUCTURAL TEMPLATES, not legal
  // text: institution-specific details stay as bracketed [...] placeholders and
  // every page leads with a draft-review notice (a Markdown blockquote → the
  // warning-styled callout in lib/blocks/registry.tsx Prose). The school's DPO
  // and legal officer complete and sign off before these are treated as final.
  // bg-only: /en serves the bg version via the resolver locale fallback and is
  // flagged untranslated. EXCLUDED from the DeepL pass — legal text needs human
  // translation, not machine translation.
  // TODO(legal): DPO + legal officer to fill every [...] placeholder, confirm
  // retention periods, controller identity, processor/DPA list, KZLD contact,
  // and the accessibility feedback/escalation details, then remove this notice.
  const DRAFT_NOTICE =
    '> ⚠️ **ЧЕРНОВА — подлежи на правен преглед преди публикуване.** Това е структурен шаблон. Конкретните данни в квадратни скоби [...] се попълват и одобряват от длъжностното лице по защита на данните (DPO) и юридическия отговорник на училището преди публикуване. Текстът не представлява правен съвет.';

  const legalPages = [
    {
      slug: 'poveritelnost',
      locale: 'bg',
      title: 'Политика за поверителност',
      excerpt: 'Информация за обработването на лични данни съгласно Регламент (ЕС) 2016/679 (ОРЗД) и ЗЗЛД.',
      status: 'PUBLISHED',
      published: true,
      kind: 'PAGE',
      blocks: [
        { id: 'notice', type: 'Markdown', props: { value: DRAFT_NOTICE } },
        {
          id: 'intro',
          type: 'Markdown',
          props: {
            value:
              'Тази политика обяснява как [пълно наименование на администратора] обработва Вашите лични данни в съответствие с Регламент (ЕС) 2016/679 (Общ регламент относно защитата на данните, „ОРЗД“) и Закона за защита на личните данни (ЗЗЛД). Тя се предоставя на основание чл. 13 и чл. 14 от ОРЗД.',
          },
        },
        {
          id: 'controller',
          type: 'Markdown',
          props: {
            value:
              '## Администратор на лични данни\n\nАдминистратор на Вашите лични данни е:\n\n- **Наименование:** [пълно официално наименование на училището]\n- **Адрес:** [адрес на управление]\n- **Имейл:** [официален имейл за кореспонденция]\n- **Телефон:** [телефон]',
          },
        },
        {
          id: 'dpo',
          type: 'Markdown',
          props: {
            value:
              '## Длъжностно лице по защита на данните (DPO)\n\nЗа въпроси относно обработването на Вашите лични данни можете да се свържете с длъжностното лице по защита на данните:\n\n- **Име/функция:** [име или функция на DPO]\n- **Имейл:** [имейл на DPO]\n- **Телефон:** [телефон на DPO]',
          },
        },
        {
          id: 'data',
          type: 'Markdown',
          props: {
            value:
              '## Какви лични данни събираме\n\nВ зависимост от Вашето взаимодействие с уебсайта обработваме следните категории данни:\n\n- **Данни от формуляри за контакт:** [име, имейл, съдържание на съобщението].\n- **Данни на администраторски акаунти:** [имейл, криптирана парола, данни за двуфакторна автентикация].\n- **Технически данни:** [IP адрес, тип браузър — само доколкото е необходимо за сигурност].\n\nУебсайтът не събира специални категории лични данни и не извършва автоматизирано вземане на решения или профилиране.',
          },
        },
        {
          id: 'purposes',
          type: 'Markdown',
          props: {
            value:
              '## Цели и правно основание\n\nОбработваме лични данни за следните цели и на следните правни основания по чл. 6, ал. 1 от ОРЗД:\n\n- **Отговор на запитвания през формуляра за контакт** — основание: [съгласие / легитимен интерес], срок: [срок].\n- **Управление на администраторски достъп и сигурност** — основание: [легитимен интерес / законово задължение].\n- **Защита от злоупотреби (Cloudflare Turnstile)** — основание: [легитимен интерес].',
          },
        },
        {
          id: 'recipients',
          type: 'Markdown',
          props: {
            value:
              '## Получатели на данните\n\nЛичните данни могат да бъдат обработвани от следните категории обработващи лица, всяко обвързано с договор за обработване (DPA):\n\n- **Хостинг и доставка:** [Vercel Inc.].\n- **База данни:** [Neon].\n- **Кеш/сесии:** [Upstash Redis].\n- **Изпращане на имейли:** [Resend].\n- **Защита от ботове:** [Cloudflare Turnstile].\n\nПри пренос на данни извън ЕС/ЕИП се прилагат подходящи гаранции по глава V от ОРЗД (напр. [Стандартни договорни клаузи]). [Да се потвърди списъкът и местоположението на обработващите лица.]',
          },
        },
        {
          id: 'retention',
          type: 'Markdown',
          props: {
            value:
              '## Срок на съхранение\n\nСъхраняваме личните данни само за времето, необходимо за съответната цел:\n\n- Запитвания през формуляра за контакт: [срок].\n- Администраторски акаунти: [за срока на активния достъп + срок].\n- Записи в одитния дневник: [срок].\n\n[Сроковете да се потвърдят от DPO.]',
          },
        },
        {
          id: 'rights',
          type: 'Markdown',
          props: {
            value:
              '## Вашите права\n\nСъгласно ОРЗД имате право на:\n\n- **достъп** до Вашите лични данни (чл. 15);\n- **коригиране** на неточни данни (чл. 16);\n- **изтриване** („право да бъдеш забравен“, чл. 17);\n- **ограничаване** на обработването (чл. 18);\n- **преносимост** на данните (чл. 20);\n- **възражение** срещу обработването (чл. 21).\n\nЗа да упражните правата си, свържете се с нас на [имейл за упражняване на права]. Отговаряме в срок до [срок съгласно чл. 12 от ОРЗД].',
          },
        },
        {
          id: 'complaint',
          type: 'Markdown',
          props: {
            value:
              '## Право на жалба\n\nАко смятате, че обработването на Вашите лични данни нарушава закона, имате право да подадете жалба до надзорния орган:\n\n- **Комисия за защита на личните данни (КЗЛД)**\n- [адрес, телефон и имейл на КЗЛД — да се потвърдят; виж www.cpdp.bg]',
          },
        },
        {
          id: 'updated',
          type: 'Markdown',
          props: { value: '---\n\n_Дата на последна актуализация: [дата]._' },
        },
      ],
    },
    {
      slug: 'biskvitki',
      locale: 'bg',
      title: 'Политика за бисквитките',
      excerpt: 'Какви бисквитки използва този сайт, с каква цел и как да ги управлявате.',
      status: 'PUBLISHED',
      published: true,
      kind: 'PAGE',
      blocks: [
        { id: 'notice', type: 'Markdown', props: { value: DRAFT_NOTICE } },
        {
          id: 'intro',
          type: 'Markdown',
          props: {
            value:
              'Бисквитките са малки текстови файлове, които се съхраняват в браузъра Ви. По-долу е описано какви бисквитки и подобни технологии използва този сайт, с каква цел и за какъв срок.',
          },
        },
        {
          id: 'necessary',
          type: 'Markdown',
          props: {
            value:
              '## Строго необходими\n\nТези бисквитки са нужни за основното функциониране на сайта и не могат да бъдат изключени:\n\n- **Предпочитание за тема (светла/тъмна)** — запазва избора Ви за изгледа. Цел: ползваемост. Срок: [до изтриване / срок].\n- **Език/локал (next-intl, NEXT_LOCALE)** — запомня избрания език (BG/EN). Цел: езиково предпочитание. Срок: [срок].\n- **Сесия за вход (NextAuth)** — поддържа автентикацията в административния панел. Цел: сигурен достъп. Срок: за сесията / [срок].\n- **Cloudflare Turnstile** — защита от ботове във формулярите. Цел: сигурност. Срок: краткотраен.',
          },
        },
        {
          id: 'analytics',
          type: 'Markdown',
          props: {
            value:
              '## Анализ на посещаемостта\n\n- **Vercel Web Analytics** — събира обобщена статистика за посещенията **без бисквитки** (cookieless) и без проследяване между сайтове. Не се съхранява информация, която Ви идентифицира лично. [Да се потвърди конфигурацията.]',
          },
        },
        {
          id: 'manage',
          type: 'Markdown',
          props: {
            value:
              '## Как да управлявате бисквитките\n\nМожете по всяко време да изтриете или блокирате бисквитките от настройките на браузъра си. Имайте предвид, че блокирането на строго необходимите бисквитки може да наруши работата на сайта (напр. вход в административния панел).',
          },
        },
        {
          id: 'consent-assessment',
          type: 'Markdown',
          props: {
            value:
              '## Оценка: необходим ли е банер за съгласие?\n\n**Предварителна оценка:** текущият набор се състои само от *строго необходими* бисквитки и анализ *без бисквитки* (cookieless). При това положение по принцип **не се изисква** банер за съгласие за бисквитки, тъй като не се поставят бисквитки за проследяване/маркетинг, изискващи предварително съгласие.\n\n> ⚠️ Това е предварителна оценка, а не окончателно правно становище. Решението дали е необходим банер за съгласие се взема и документира от DPO/юридическия отговорник. Банер **не е изграден** и не следва да се добавя, освен ако правният преглед изрично го изисква.',
          },
        },
        {
          id: 'updated',
          type: 'Markdown',
          props: { value: '---\n\n_Дата на последна актуализация: [дата]._' },
        },
      ],
    },
    {
      slug: 'dostapnost',
      locale: 'bg',
      title: 'Декларация за достъпност',
      excerpt: 'Статус на съответствие с WCAG 2.1 AA, известни ограничения, обратна връзка и процедура по прилагане.',
      status: 'PUBLISHED',
      published: true,
      kind: 'PAGE',
      blocks: [
        { id: 'notice', type: 'Markdown', props: { value: DRAFT_NOTICE } },
        {
          id: 'intro',
          type: 'Markdown',
          props: {
            value:
              '[Наименование на органа от публичния сектор] се ангажира да осигури достъпността на този уебсайт в съответствие с [приложимото национално законодателство, транспониращо Директива (ЕС) 2016/2102 относно достъпността на уебсайтовете на органите от обществения сектор].',
          },
        },
        {
          id: 'status',
          type: 'Markdown',
          props: {
            value:
              '## Статус на съответствие\n\nЦелевото ниво на съответствие е **WCAG 2.1, ниво AA**. Понастоящем уебсайтът **съответства частично** на това ниво поради изброените по-долу известни ограничения, по които се работи.',
          },
        },
        {
          id: 'limitations',
          type: 'Markdown',
          props: {
            value:
              '## Известни ограничения\n\n- **Тъмен режим в административната част:** някои вътрешни екрани на администрацията все още не покриват напълно контрастните изисквания на AA в тъмен режим. Привеждането в съответствие е в процес на изпълнение.\n- **Съдържание на английски език:** английската версия на част от съдържанието предстои (машинен превод с последваща човешка редакция); до приключването му тези страници се показват на български.\n\n[Списъкът да се актуализира след одит от DPO/отговорника по достъпност.]',
          },
        },
        {
          id: 'preparation',
          type: 'Markdown',
          props: {
            value:
              '## Изготвяне на декларацията\n\n- **Дата на изготвяне:** [дата].\n- **Метод на оценка:** [самооценка / оценка от трета страна].\n- **Дата на последен преглед:** [дата].',
          },
        },
        {
          id: 'feedback',
          type: 'Markdown',
          props: {
            value:
              '## Обратна връзка и контакт\n\nАко срещнете пречка за достъпност или се нуждаете от съдържание в достъпен формат, моля свържете се с нас:\n\n- **Имейл:** [имейл за сигнали относно достъпността]\n- **Телефон:** [телефон]\n- **Адрес:** [адрес]\n\nСтремим се да отговорим в срок до [срок].',
          },
        },
        {
          id: 'enforcement',
          type: 'Markdown',
          props: {
            value:
              '## Процедура по прилагане\n\nАко не получите задоволителен отговор на сигнала или искането си, можете да отнесете въпроса до [надзорния орган съгласно националното законодателство за достъпност]:\n\n- [наименование на надзорния орган]\n- [адрес, телефон и имейл на надзорния орган]',
          },
        },
        {
          id: 'updated',
          type: 'Markdown',
          props: { value: '---\n\n_Дата на последна актуализация: [дата]._' },
        },
      ],
    },
  ];

  for (const page of legalPages) {
    await prisma.page.upsert({
      where: { slug_locale: { slug: page.slug, locale: page.locale } },
      update: page,
      create: { ...page, authorId: user.id },
    });
  }
  console.log(`✓ Seeded ${legalPages.length} legal template pages (poveritelnost, biskvitki, dostapnost — bg, DRAFT)`);

  // R3 fixture: a PUBLISHED news post dated far in the future — hidden from
  // /bg/news by the isPublic date gate until its date passes (scheduling stays
  // encoded as a future date; status is PUBLISHED, not SCHEDULED).
  const scheduledNews = {
    id: 'm04-scheduled-news',
    locale: 'bg',
    title: 'Насрочена новина (M0.4)',
    excerpt: 'Публикувана, но с бъдеща дата — не се вижда още.',
    bodyMarkdown: 'Тази новина е насрочена за бъдеща дата.',
    date: new Date('2099-01-01'),
    featuredImage: '/images/news/workshops.svg',
    published: true,
    status: 'PUBLISHED',
  };
  await prisma.newsPost.upsert({
    where: { id_locale: { id: scheduledNews.id, locale: scheduledNews.locale } },
    update: scheduledNews,
    create: { ...scheduledNews, authorId: user.id },
  });
  console.log('✓ Seeded 1 scheduled (future-dated) news post');

  // --- News category as parent Page (M2.4) ----------------------------------
  const newsCategoryPage = await prisma.page.upsert({
    where: { slug_locale: { slug: 'novini-sabitiya', locale: 'bg' } },
    update: { title: 'Събития' },
    create: { slug: 'novini-sabitiya', locale: 'bg', title: 'Събития', kind: 'FOLDER', status: 'PUBLISHED', published: true, visible: false },
  });
  const categorizedNews = {
    id: 'm24-categorized-news', locale: 'bg',
    title: 'Новина с категория-страница (M2.4)',
    excerpt: 'Категорията идва от свързаната родителска страница „Събития“.',
    bodyMarkdown: 'Тази новина е филирана под категория-страница.',
    date: new Date('2026-03-01'), featuredImage: '/images/news/workshops.svg',
    published: true, status: 'PUBLISHED', colorTag: 'GREEN',
    categoryPageId: newsCategoryPage.id,
    metaTitle: 'Прием 2026 — SEO заглавие', metaDescription: 'SEO описание за прием 2026.',
  };
  await prisma.newsPost.upsert({
    where: { id_locale: { id: categorizedNews.id, locale: categorizedNews.locale } },
    update: categorizedNews,
    create: { ...categorizedNews, authorId: user.id },
  });
  console.log('✓ Seeded 1 news post categorized by parent Page (M2.4)');

  // --- Media Library (G2-1) -------------------------------------------------
  // Demonstrates the three states the library surfaces: alt OK, alt missing,
  // and a minor's photo (consent recorded vs. not). Local SVG URLs so they
  // render without a real blob upload in dev.
  const mediaSeed = [
    {
      id: 'media-seed-olympiad', folder: 'news', filename: 'olimpiada.jpg',
      url: '/images/news/workshops.svg', pathname: 'seed/olimpiada.jpg',
      mimeType: 'image/jpeg', size: 421888, width: 1920, height: 1080,
      alt: 'Ученици на олимпиада по информатика', isMinorPhoto: true,
      consentRecordedAt: new Date('2026-06-05'),
    },
    {
      id: 'media-seed-team', folder: 'team', filename: 'ekip-nov.jpg',
      url: '/images/news/workshops.svg', pathname: 'seed/ekip-nov.jpg',
      mimeType: 'image/jpeg', size: 318000, width: 1600, height: 900,
      alt: null, isMinorPhoto: false, consentRecordedAt: null,
    },
    {
      id: 'media-seed-robofest', folder: 'galleries', filename: 'robofest-3.jpg',
      url: '/images/news/workshops.svg', pathname: 'seed/robofest-3.jpg',
      mimeType: 'image/jpeg', size: 502000, width: 2048, height: 1365,
      alt: 'Отбор по роботика на Robofest', isMinorPhoto: true, consentRecordedAt: null,
    },
    {
      id: 'media-seed-partners', folder: 'partners', filename: 'partnyori.png',
      url: '/images/news/workshops.svg', pathname: 'seed/partnyori.png',
      mimeType: 'image/png', size: 88000, width: 800, height: 400,
      alt: 'Лога на партньори', isMinorPhoto: false, consentRecordedAt: null,
    },
  ];
  for (const m of mediaSeed) {
    await prisma.media.upsert({
      where: { id: m.id },
      update: m,
      create: { ...m, authorId: user.id },
    });
  }
  console.log(`✓ Seeded ${mediaSeed.length} media library assets`);

  // --- Documents (G2-2 type) ------------------------------------------------
  const documentsSeed = [
    {
      slug: 'pravilnik-vatreshen-red', locale: 'bg', title: 'Правилник за вътрешния ред',
      description: 'Вътрешни правила на училището.', category: 'Правилници',
      fileUrl: '/files/pravilnik-vatreshen-red.pdf', fileType: 'PDF', fileSize: '1.2 MB',
      color: 'BLUE', status: 'PUBLISHED', order: 1,
    },
    {
      slug: 'etichen-kodeks', locale: 'bg', title: 'Етичен кодекс',
      description: 'Етичен кодекс на училищната общност.', category: 'Правилници',
      fileUrl: '/files/etichen-kodeks.pdf', fileType: 'PDF', fileSize: '640 KB',
      color: 'TEAL', status: 'PUBLISHED', order: 2,
    },
    {
      slug: 'zayavlenie-priem', locale: 'bg', title: 'Заявление за прием',
      description: 'Формуляр за кандидатстване.', category: 'Формуляри',
      fileUrl: '/files/zayavlenie-priem.docx', fileType: 'DOC', fileSize: '88 KB',
      color: 'GREEN', status: 'PUBLISHED', order: 1,
    },
    {
      slug: 'draft-document', locale: 'bg', title: 'Чернова документ (скрит)',
      category: 'Формуляри', fileUrl: '/files/draft.pdf', fileType: 'PDF',
      color: 'GRAY', status: 'DRAFT', order: 9,
    },
  ];
  for (const d of documentsSeed) {
    await prisma.document.upsert({
      where: { slug_locale: { slug: d.slug, locale: d.locale } },
      update: d,
      create: { ...d, authorId: user.id },
    });
  }
  console.log(`✓ Seeded ${documentsSeed.length} documents`);

  // --- Gallery (G2-2 type) --------------------------------------------------
  const gallerySeed = [
    { slug: 'open-doors-2026', locale: 'bg', title: 'Ден на отворените врати 2026', imageUrl: '/images/news/open-doors.svg', alt: 'Ден на отворените врати', album: 'sabitiya', color: 'BLUE', status: 'PUBLISHED', order: 1 },
    { slug: 'olympiad-medals', locale: 'bg', title: 'Национална олимпиада', imageUrl: '/images/news/olympiad-medals.svg', alt: 'Медали от олимпиада', album: 'olimpiadi', color: 'ORANGE', status: 'PUBLISHED', order: 2 },
    { slug: 'robotics-lab', locale: 'bg', title: 'Робофест 2026', imageUrl: '/images/news/robotics-lab.svg', alt: 'Робофест', album: 'sabitiya', color: 'TEAL', status: 'PUBLISHED', order: 3 },
    { slug: 'workshops', locale: 'bg', title: 'Лятна академия', imageUrl: '/images/news/workshops.svg', alt: 'Лятна академия', album: 'ezhednevie', color: 'GREEN', status: 'PUBLISHED', order: 4 },
    { slug: 'alumni-meetup', locale: 'bg', title: 'Абитуриентски бал', imageUrl: '/images/news/alumni-meetup.svg', alt: 'Абитуриентски бал', album: 'abiturienti', color: 'PURPLE', status: 'PUBLISHED', order: 5 },
    { slug: 'hidden-gallery-draft', locale: 'bg', title: 'Чернова снимка (скрита)', imageUrl: '/images/news/hackathon-2026.svg', alt: 'скрита', album: 'sabitiya', color: 'GRAY', status: 'DRAFT', order: 9 },
  ];
  for (const g of gallerySeed) {
    await prisma.galleryItem.upsert({
      where: { slug_locale: { slug: g.slug, locale: g.locale } },
      update: g,
      create: { ...g, authorId: user.id },
    });
  }
  console.log(`✓ Seeded ${gallerySeed.length} gallery items`);

  // --- Team members (G2-2 type) ---------------------------------------------
  const teamSeed = [
    { slug: 'director', locale: 'bg', name: 'инж. Стефан Бумбалов', role: 'Директор', category: 'Ръководство', email: 'director@elsys-bg.org', color: 'BLUE', status: 'PUBLISHED', order: 1 },
    { slug: 'deputy-director', locale: 'bg', name: 'Мария Петрова', role: 'Заместник-директор', category: 'Ръководство', email: 'deputy@elsys-bg.org', color: 'TEAL', status: 'PUBLISHED', order: 2 },
    { slug: 'teacher-informatics', locale: 'bg', name: 'Иван Георгиев', role: 'Преподавател по информатика', category: 'Преподаватели', email: 'igeorgiev@elsys-bg.org', color: 'GREEN', status: 'PUBLISHED', order: 3 },
    { slug: 'teacher-draft', locale: 'bg', name: 'Скрит преподавател', role: 'Преподавател', category: 'Преподаватели', color: 'GRAY', status: 'DRAFT', order: 9 },
  ];
  for (const m of teamSeed) {
    await prisma.teamMember.upsert({
      where: { slug_locale: { slug: m.slug, locale: m.locale } },
      update: m,
      create: { ...m, authorId: user.id },
    });
  }
  console.log(`✓ Seeded ${teamSeed.length} team members`);

  // --- Partners (G2-2 type) -------------------------------------------------
  const partnersSeed = [
    { slug: 'tu-sofia', locale: 'bg', name: 'Технически университет – София', logo: '/images/news/partnership.svg', url: 'https://tu-sofia.bg', category: 'Университети', color: 'BLUE', status: 'PUBLISHED', order: 1 },
    { slug: 'sap-labs', locale: 'bg', name: 'SAP Labs Bulgaria', logo: '/images/news/partnership.svg', url: 'https://sap.com', category: 'Бизнес', color: 'TEAL', status: 'PUBLISHED', order: 2 },
    { slug: 'musala-soft', locale: 'bg', name: 'Musala Soft', logo: '/images/news/partnership.svg', url: 'https://musala.com', category: 'Бизнес', color: 'GREEN', status: 'PUBLISHED', order: 3 },
    { slug: 'hidden-partner', locale: 'bg', name: 'Скрит партньор', logo: '/images/news/partnership.svg', category: 'Бизнес', color: 'GRAY', status: 'DRAFT', order: 9 },
  ];
  for (const p of partnersSeed) {
    await prisma.partner.upsert({
      where: { slug_locale: { slug: p.slug, locale: p.locale } },
      update: p,
      create: { ...p, authorId: user.id },
    });
  }
  console.log(`✓ Seeded ${partnersSeed.length} partners`);

  // --- Projects (G2-2 type) -------------------------------------------------
  const projectsSeed = [
    { slug: 'erasmus-digital', locale: 'bg', title: 'Дигитални умения (Еразъм+)', description: 'Международен обмен и обучения по дигитални компетентности.', image: '/images/news/partnership.svg', url: 'https://erasmus-plus.ec.europa.eu', category: 'Еразъм+', color: 'BLUE', status: 'PUBLISHED', order: 1 },
    { slug: 'green-school', locale: 'bg', title: 'Зелено училище', description: 'Енергийна ефективност и устойчивост в училищната сграда.', image: '/images/news/workshops.svg', category: 'Околна среда', color: 'GREEN', status: 'PUBLISHED', order: 2 },
    { slug: 'hidden-project', locale: 'bg', title: 'Скрит проект', description: 'Чернова.', category: 'Друго', color: 'GRAY', status: 'DRAFT', order: 9 },
  ];
  for (const p of projectsSeed) {
    await prisma.project.upsert({
      where: { slug_locale: { slug: p.slug, locale: p.locale } },
      update: p,
      create: { ...p, authorId: user.id },
    });
  }
  console.log(`✓ Seeded ${projectsSeed.length} projects`);

  // --- Awards (G2-2 type, D-10 yearly-append) -------------------------------
  const awardsSeed = [
    { slug: 'ioi-gold-2025', locale: 'bg', title: 'Златен медал, IOI 2025', description: 'Международна олимпиада по информатика.', image: '/images/news/olympiad-medals.svg', year: 2025, category: 'Олимпиади', color: 'ORANGE', status: 'PUBLISHED', order: 1 },
    { slug: 'robofest-1st-2024', locale: 'bg', title: 'Първо място, Robofest 2024', description: 'Национално състезание по роботика.', image: '/images/news/robotics-lab.svg', year: 2024, category: 'Роботика', color: 'TEAL', status: 'PUBLISHED', order: 1 },
    { slug: 'hidden-award', locale: 'bg', title: 'Скрита награда', year: 2023, category: 'Друго', color: 'GRAY', status: 'DRAFT', order: 9 },
  ];
  for (const a of awardsSeed) {
    await prisma.award.upsert({ where: { slug_locale: { slug: a.slug, locale: a.locale } }, update: a, create: { ...a, authorId: user.id } });
  }
  console.log(`✓ Seeded ${awardsSeed.length} awards`);

  // --- Leaders / alumni (G2-2 type, D-10 yearly-append) ---------------------
  const leadersSeed = [
    { slug: 'alumna-2020', locale: 'bg', name: 'Елена Иванова', role: 'Софтуерен инженер, Google', year: 2020, color: 'BLUE', status: 'PUBLISHED', order: 1 },
    { slug: 'alumnus-2019', locale: 'bg', name: 'Георги Петров', role: 'Съосновател на стартъп', year: 2019, color: 'GREEN', status: 'PUBLISHED', order: 1 },
    { slug: 'hidden-leader', locale: 'bg', name: 'Скрит випускник', role: 'Чернова', year: 2018, color: 'GRAY', status: 'DRAFT', order: 9 },
  ];
  for (const l of leadersSeed) {
    await prisma.leader.upsert({ where: { slug_locale: { slug: l.slug, locale: l.locale } }, update: l, create: { ...l, authorId: user.id } });
  }
  console.log(`✓ Seeded ${leadersSeed.length} leaders`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
