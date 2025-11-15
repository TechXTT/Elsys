/* eslint-disable no-console */
// Import a curated set of BG pages with block content into the CMS.
// - Upserts pages by exact full slug when possible
// - Falls back to locating hierarchical children under section parents
// - Creates missing parents (as FOLDER) only if necessary
// - Normalizes blocks via the registry validators to ensure render parity

import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

// Lightweight in-script validator mirroring lib/blocks/registry minimal needs
function isRecord(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
const str = (v, f = '') => (typeof v === 'string' ? v : f);
const num = (v, f = 0) => (typeof v === 'number' ? v : f);

function validateBlocks(blocks) {
  const errors = [];
  if (!Array.isArray(blocks)) return { valid: false, errors: ['Blocks must be an array'], normalized: [] };
  const normalized = [];
  blocks.forEach((raw, idx) => {
    if (!isRecord(raw) || typeof raw.type !== 'string') {
      errors.push(`Block[${idx}] must be an object with a string 'type'`);
      return;
    }
    const p = isRecord(raw.props) ? raw.props : {};
    switch (raw.type) {
      case 'Hero': {
        const heading = str(p.heading);
        if (!heading) { errors.push(`Block[${idx}] Hero.heading is required`); return; }
        const cta = isRecord(p.cta) && str(p.cta.label) && str(p.cta.href)
          ? { label: str(p.cta.label), href: str(p.cta.href) }
          : undefined;
        normalized.push({ type: 'Hero', props: { heading, subheading: str(p.subheading), image: str(p.image), cta } });
        return;
      }
      case 'Section': {
        const title = str(p.title);
        if (!title) { errors.push(`Block[${idx}] Section.title is required`); return; }
        normalized.push({ type: 'Section', props: { title, description: str(p.description), markdown: str(p.markdown) } });
        return;
      }
      case 'Markdown': {
        normalized.push({ type: 'Markdown', props: { value: str(p.value) } });
        return;
      }
      case 'NewsList': {
        normalized.push({ type: 'NewsList', props: { title: str(p.title), description: str(p.description), limit: num(p.limit) } });
        return;
      }
      default:
        // Accept unknown blocks as-is to avoid blocking import
        normalized.push({ type: raw.type, props: p });
    }
  });
  return { valid: errors.length === 0, errors, normalized };
}

function inferTitleFromBlocks(blocks, fallback) {
  if (Array.isArray(blocks)) {
    const first = blocks.find((b) => isRecord(b) && typeof b.type === 'string');
    if (first && isRecord(first.props)) {
      if (first.type === 'Hero' && typeof first.props.heading === 'string' && first.props.heading) return first.props.heading;
      if (first.type === 'Section' && typeof first.props.title === 'string' && first.props.title) return first.props.title;
    }
  }
  return fallback || 'Untitled';
}

const prisma = new PrismaClient();

function gid(prefix = 'G|page') {
  return `${prefix}|${crypto.randomUUID()}`;
}

// The curated list provided by the user (BG locale)
const input = [
  {
    slug: '',
    blocks: [
      { type: 'Hero', props: { heading: 'Технологично училище „Електронни системи“', subheading: 'Към Технически университет – София. Подготвяме бъдещите ИТ лидери на България.', image: '', cta: { label: 'Защо да избера ТУЕС?', href: '/priem/zashto-da-izbera-tues' } } },
      { type: 'Markdown', props: { value: 'ТУЕС е специализирано технологично училище от национално значение, което вече десетилетия подготвя висококвалифицирани млади специалисти в областта на информационните и комуникационните технологии.' } },
      { type: 'Markdown', props: { value: 'Обучението е петгодишно и е фокусирано върху три основни специалности – **Системно програмиране**, **Компютърни мрежи** и **Програмиране на изкуствен интелект**, с комбинация от теория, практика и работа по реални проекти.' } },
      { type: 'Section', props: { title: 'ТУЕС в числа', description: '', markdown: '* над 35 години история;\n* стотици завършили ученици годишно;\n* десетки отличия от национални и международни състезания;\n* силна общност от възпитаници, които се реализират в водещи ИТ компании.' } },
      { type: 'NewsList', props: { title: 'Новини', description: 'Най-важното от живота на ТУЕС – събития, състезания и постижения.', limit: 6 } },
    ],
  },
  { slug: 'uchilishteto/misija', blocks: [
    { type: 'Markdown', props: { value: 'Мисията на Технологично училище „Електронни системи“ към Технически университет – София е да подготвя висококвалифицирани млади специалисти в областта на информационните и комуникационните технологии и да развива бъдещите лидери на ИТ сектора.' } },
    { type: 'Markdown', props: { value: 'Учениците преминават през петгодишно обучение, в което комбинират фундаментални знания по математика и информатика със специализирани ИТ дисциплини, практически проекти, стажове и дипломна работа.' } },
    { type: 'Markdown', props: { value: 'ТУЕС възпитава любопитство, умения за екипна работа и решаване на сложни проблеми, предприемаческо мислене и отговорно отношение към общността. Училището насърчава учениците да експериментират, да развиват собствени проекти и да участват активно в училищния живот.' } },
    { type: 'Section', props: { title: 'Как постигаме тези цели', description: '', markdown: '* специализиран и актуализиран учебен план, съобразен с нуждите на ИТ сектора;\n* интеграция с Технически университет – София и достъп до университетски ресурси;\n* преподаватели с богат опит в академичната и корпоративната среда;\n* тясно сътрудничество с ИТ компании и организации;\n* силна общност от ученици, родители и завършили туесари.' } },
  ] },
  { slug: 'uchilishteto/istorija', blocks: [
    { type: 'Markdown', props: { value: 'Технологично училище „Електронни системи“ (ТУЕС) към Технически университет – София е създадено през 1988 г. с идеята да подготвя специалисти със средно образование в областта на компютърните науки и информационните технологии.' } },
    { type: 'Markdown', props: { value: 'Още от своето начало училището работи в тясно сътрудничество с водещи предприятия, научни организации и ИТ компании, което осигурява модерни лаборатории, актуално учебно съдържание и реални възможности за професионално развитие на учениците.' } },
    { type: 'Markdown', props: { value: 'През годините ТУЕС се утвърждава като водещ център за обучение на млади ИТ кадри – с множество награди от олимпиади и състезания, успешни проекти и силна общност от завършили ученици, които работят в престижни компании в България и по света.' } },
  ] },
  { slug: 'uchilishteto/obshtestven-syvet', blocks: [
    { type: 'Markdown', props: { value: 'Общественият съвет на ТУЕС е консултативен орган, който подпомага ръководството на училището при вземането на важни решения, свързани с развитието на училището, учебния процес и връзката с общността.' } },
    { type: 'Markdown', props: { value: 'В съвета участват представители на родители, преподаватели, завършили ученици и партньорски организации. Чрез своите становища и препоръки те допринасят за по-доброто планиране и реализиране на политики в училището.' } },
    { type: 'Section', props: { title: 'Роля на Обществения съвет', description: '', markdown: '* подкрепя стратегическото развитие на ТУЕС;\n* дава становища по ключови документи и правилници;\n* насърчава диалога между родители, ученици, учители и партньори;\n* подпомага популяризирането на постиженията на училището.' } },
  ] },
  { slug: 'uchilishteto/lideri-zavyrshili-tues', blocks: [
    { type: 'Markdown', props: { value: 'В тази секция представяме историите на възпитаници на ТУЕС, които днес заемат ръководни позиции в български и международни компании, създават успешни бизнеси или водят иновативни екипи в ИТ индустрията.' } },
    { type: 'Markdown', props: { value: 'Всеки профил показва пътя на един туесар – от първите стъпки в училище и избора на специалност, през участия в състезания и проекти, до професионалната реализация и лидерските роли.' } },
    { type: 'Markdown', props: { value: 'Целта на страницата е да вдъхнови настоящите ученици и да демонстрира какво означава мотото „ТУЕС създава бъдещите ИТ лидери на България“.' } },
  ] },
  { slug: 'uchilishteto/prepodavatelski-ekip', blocks: [
    { type: 'Markdown', props: { value: 'Преподавателският екип на ТУЕС обединява дългогодишни учители, млади специалисти и университетски преподаватели от Технически университет – София.' } },
    { type: 'Markdown', props: { value: 'Тази комбинация гарантира стабилна теоретична основа и актуални знания, свързани с практиката в ИТ сектора. Много от преподавателите са завършили самото училище, което създава силна приемственост и връзка с туесарската общност.' } },
    { type: 'Section', props: { title: 'Структура на екипа', description: '', markdown: '* учители по общообразователни дисциплини;\n* преподаватели по специални предмети и ИТ дисциплини;\n* университетски преподаватели от ТУ – София;\n* гост-лектори и експерти от бизнеса.' } },
  ] },
  { slug: 'uchilishteto/asociacija-na-zavyrshilite-tues', blocks: [
    { type: 'Markdown', props: { value: 'Асоциацията на завършилите ТУЕС (АЗТУЕС) обединява възпитаници, настоящи ученици, преподаватели и приятели на училището с цел да подкрепя развитието на ТУЕС и неговата общност.' } },
    { type: 'Markdown', props: { value: 'Организацията работи в обществена полза, организира събития и инициативи, насърчава менторството и връзките между поколенията туесари и подпомага сътрудничеството между училището и ИТ индустрията.' } },
    { type: 'Section', props: { title: 'Основни дейности на АЗТУЕС', description: '', markdown: '* подкрепя ученически инициативи като Hack TUES и TUES Fest;\n* организира лекции, уъркшопи и Inspiration Talks;\n* изгражда мрежа от ментори и доброволци сред възпитаниците;\n* участва в проекти и кампании за развитие на училището.' } },
  ] },
  { slug: 'uchilishteto/pravilnici-i-dokumenti', blocks: [
    { type: 'Markdown', props: { value: 'На тази страница са събрани основните официални документи на ТУЕС – правилници, вътрешни разпоредби, заповеди, бюджети, отчети и различни образци на заявления и декларации.' } },
    { type: 'Section', props: { title: 'Какво ще намерите тук', description: '', markdown: '* образци за дипломни работи и инструкции за оформяне;\n* заявления за стипендии, служебни бележки, академични справки и отсъствия;\n* заповеди на директора и свързани документи;\n* документи и наредби на МОН, касаещи организацията на учебния процес;\n* бюджети и касови отчети, свързани с дейността на училището.' } },
  ] },
  { slug: 'uchilishteto/tues-v-chisla', blocks: [
    { type: 'Markdown', props: { value: '„ТУЕС в числа“ представя в кратка форма мащаба и постиженията на училището чрез ключови показатели и статистика.' } },
    { type: 'Section', props: { title: 'Основни показатели', description: '', markdown: '* над 35 години история;\n* хиляди завършили ученици;\n* десетки национални и международни награди и отличия;\n* стотици стажове годишно в ИТ компании;\n* множество шампиони и лауреати от състезания по програмиране и компютърни мрежи.' } },
  ] },
  { slug: 'uchilishteto/kontakti', blocks: [
    { type: 'Markdown', props: { value: 'Технологично училище „Електронни системи“ към ТУ – София се намира на територията на Технически университет – София.' } },
    { type: 'Section', props: { title: 'Адрес и контакти', description: '', markdown: 'София, ул. „Росарио“ 1, Технически университет – София, блок 8 и 9.\n\nТелефон: 0886 75 10 94\n\nE-mail: tues@elsys-bg.org' } },
    { type: 'Section', props: { title: 'Как да стигнете', description: '', markdown: 'До училището се стига с автобусни линии, обслужващи района на ж.к. „Дървеница“, както и с метро до станция „Г.М. Димитров“, откъдето има директни автобусни връзки.' } },
  ] },
  { slug: 'obuchenie/inovativen-ucheben-podhod', blocks: [
    { type: 'Markdown', props: { value: 'В ТУЕС обучението е организирано като петгодишен курс, който съчетава задълбочени теоретични знания с интензивна практическа подготовка по трите специалности – Системно програмиране, Компютърни мрежи и Програмиране на изкуствен интелект.' } },
    { type: 'Markdown', props: { value: 'Първите три години са насочени към общи ИТ основи – програмиране, компютърни системи, мрежи, електроника и математика. В 11. и 12. клас фокусът се измества към специализираните предмети за избраната специалност и работа по реални проекти.' } },
    { type: 'Section', props: { title: 'Елементи на подхода', description: '', markdown: '* комбинация от теория и практика;\n* проектно-базирано обучение;\n* участие в състезания и олимпиади;\n* работа в екип и развиване на меки умения;\n* постоянна актуализация на учебните планове.' } },
  ] },
  { slug: 'obuchenie/uchebna-programa', blocks: [
    { type: 'Markdown', props: { value: 'Учебната програма на ТУЕС е разработена така, че да отговаря както на държавните образователни изисквания, така и на конкретните нужди на ИТ сектора.' } },
    { type: 'Markdown', props: { value: 'Тя включва общообразователни предмети, специализирани ИТ дисциплини и практически занимания. За всеки клас от 8. до 12. е наличен подробен учебен план с разпределение на часовете по предмети.' } },
    { type: 'Section', props: { title: 'Учебни планове', description: '', markdown: 'На тази страница са публикувани актуалните учебни планове за всяка паралелка, достъпни за изтегляне от ученици, родители и преподаватели.' } },
  ] },
  { slug: 'obuchenie/profesionalno-obrazovanie', blocks: [
    { type: 'Markdown', props: { value: 'ТУЕС подготвя ученици в професионални направления „Компютърни науки“ и „Електроника, автоматика, комуникационна и компютърна техника“, със специалности „Системно програмиране“ и „Компютърни мрежи“.' } },
    { type: 'Markdown', props: { value: 'Обучението е с разширено изучаване на английски език и дава възможност за явяване както на държавни зрелостни изпити за средно образование, така и на държавни изпити за придобиване на степен на професионална квалификация.' } },
    { type: 'Section', props: { title: 'След завършване', description: '', markdown: 'Завършилите ученици получават диплома за средно образование и свидетелство за професионална квалификация, което им отваря път към ИТ индустрията и към висшето образование.' } },
  ] },
  { slug: 'obuchenie/integracija-s-tehnicheskija-uniersitet', blocks: [
    { type: 'Markdown', props: { value: 'ТУЕС е част от структурата на Технически университет – София. Учебните планове се обсъждат и приемат от съответните факултети и се утвърждават от ректора на университета.' } },
    { type: 'Markdown', props: { value: 'Значителна част от преподавателите в ТУЕС са университетски преподаватели, а учениците имат достъп до лаборатории, кръжоци и извънкласни форми в ТУ – София.' } },
    { type: 'Section', props: { title: 'Ползи за учениците', description: '', markdown: '* обучение по програми, съобразени с университетските стандарти;\n* контакт с академични преподаватели и научни екипи;\n* възможности за продължаване на обучението във висшето училище;\n* по-плавен преход между училище и университет.' } },
  ] },
  { slug: 'obuchenie/diplomna-rabota', blocks: [
    { type: 'Markdown', props: { value: 'Дипломната работа е кулминацията на обучението в 12. клас и представлява самостоятелен проект, чрез който учениците демонстрират придобитите знания и умения по специалността.' } },
    { type: 'Markdown', props: { value: 'Темите могат да бъдат свързани със софтуерни приложения, мрежови решения, вградени системи, проекти в сферата на изкуствения интелект и други иновативни направления.' } },
    { type: 'Section', props: { title: 'Процесът накратко', description: '', markdown: '* избор на тема и научен ръководител;\n* планиране и реализация на проекта;\n* оформяне на писмена дипломна работа;\n* защита пред комисия с презентация и демонстрация.' } },
  ] },
  { slug: 'obuchenie/cisco-akademija', blocks: [
    { type: 'Markdown', props: { value: 'В ТУЕС функционира локална Cisco академия, в която учениците се обучават по програми от серията CCNA и придобиват знания и умения в областта на компютърните мрежи.' } },
    { type: 'Markdown', props: { value: 'Занятията се провеждат в специализирани лаборатории с реално мрежово оборудване и комбинират теоретични лекции с практически упражнения и симулации.' } },
    { type: 'Section', props: { title: 'Ползи от участието', description: '', markdown: '* задълбочени знания по мрежови технологии;\n* подготовка за международно признати сертификати;\n* предимство при кандидатстване за стажове и работа в областта на мрежовите технологии.' } },
  ] },
  { slug: 'obuchenie/partniorstvo-s-biznesa', blocks: [
    { type: 'Markdown', props: { value: 'ТУЕС поддържа дългогодишни партньорства с водещи ИТ компании, които участват в обучението чрез стажове, менторски програми, гост-лекции и съвместни проекти.' } },
    { type: 'Markdown', props: { value: 'Тази връзка с реалния сектор помага учебното съдържание да е актуално и ориентирано към практиката и дава възможност на учениците да се запознаят с различни професионални роли.' } },
    { type: 'Section', props: { title: 'Проект INVESTech', description: '', markdown: 'ТУЕС участва и в международния проект INVESTech, насочен към изграждане на мрежа от центрове за професионално превъзходство в областта на ИКТ, които развиват иновации, зелени и дигитални умения и сътрудничество между образование и бизнес.' } },
  ] },
  { slug: 'obuchenie/uchebna-praktika-po-specialnostta', blocks: [
    { type: 'Markdown', props: { value: 'В края на 11. клас учениците от ТУЕС провеждат учебна практика в реална работна среда – ИТ компании и организации, с които училището си партнира.' } },
    { type: 'Markdown', props: { value: 'По време на практиката те работят по реални задачи под ръководството на специалисти от бранша, прилагат наученото в училище и се запознават с корпоративната култура и работните процеси.' } },
    { type: 'Section', props: { title: 'Защо практиката е важна', description: '', markdown: '* дава първи опит в реална фирмена среда;\n* подпомага избора на бъдещо професионално развитие;\n* често прераства в стаж или първа работа след завършване.' } },
  ] },
  { slug: 'priem/specialnost-sistemno-programirane', blocks: [
    { type: 'Markdown', props: { value: 'Специалност „Системно програмиране“ е насочена към ученици със силен интерес към разработване на софтуер, уеб приложения и вградени системи.' } },
    { type: 'Markdown', props: { value: 'Учебният план включва фундаментални и напреднали дисциплини по програмиране, алгоритми, структури от данни, бази данни и софтуерно инженерство.' } },
    { type: 'Section', props: { title: 'Какво ще учиш', description: '', markdown: '* обектно-ориентирано програмиране;\n* скриптови и уеб технологии;\n* системи за управление на бази данни;\n* интернет програмиране и разработка на приложения;\n* програмиране за вградени компютърни системи.' } },
  ] },
  { slug: 'priem/zashto-da-izbera-tues', blocks: [
    { type: 'Markdown', props: { value: 'ТУЕС е средно училище, интегрирано в системата на Технически университет – София. Значителна част от преподавателите са университетски преподаватели, а учениците имат достъп до ресурси на висшето училище.' } },
    { type: 'Markdown', props: { value: 'Училището предлага специализиран учебен план, фокусиран върху ИТ и инженерни дисциплини, силни партньорства с бизнеса и активна общност от завършили туесари.' } },
    { type: 'Section', props: { title: 'Предимства на ТУЕС', description: '', markdown: '* интеграция с Технически университет – София;\n* специализирани ИТ специалности;\n* преподаватели с реален опит в индустрията;\n* стажове и партньорства с водещи ИТ компании;\n* силна общност от възпитаници.' } },
  ] },
  { slug: 'priem/specialnost-komputyrni-mreji', blocks: [
    { type: 'Markdown', props: { value: 'Специалност „Компютърни мрежи“ подготвя ученици за работа като системни администратори, мрежови инженери и специалисти по компютърен хардуер и комуникации.' } },
    { type: 'Markdown', props: { value: 'Обучението обхваща проектиране, изграждане и поддръжка на мрежови инфраструктури, както и мрежова сигурност, виртуализация и облачни технологии.' } },
    { type: 'Section', props: { title: 'Какво ще учиш', description: '', markdown: '* комуникационна техника и технологии;\n* мрежови технологии и протоколи;\n* изграждане и диагностика на компютърни мрежи;\n* вградени микрокомпютърни системи;\n* системна администрация, виртуализация и облачни решения.' } },
  ] },
  { slug: 'priem/den-na-otvorenite-vrati', blocks: [
    { type: 'Markdown', props: { value: 'TUES Fest е ежегодният Ден на отворените врати на ТУЕС към ТУ – София, по време на който училището представя своя образователен модел пред кандидат-гимназисти, родители и партньори от бизнеса.' } },
    { type: 'Markdown', props: { value: 'Гостите могат да видят демонстрации на ученически проекти, да посетят щандове на специалностите, да участват в работилници и лекции и да зададат въпроси към ученици, преподаватели и завършили туесари.' } },
    { type: 'Section', props: { title: 'Информация за събитието', description: '', markdown: 'На тази страница се публикуват дата, програма, място на провеждане и информация за регистрация за текущото издание на TUES Fest.' } },
  ] },
  { slug: 'priem/specialnost-programirane-na-izkustven-intelekt', blocks: [
    { type: 'Markdown', props: { value: 'Специалност „Програмиране на изкуствен интелект“ е насочена към ученици, които искат да навлязат в сферата на машинното обучение, невронните мрежи и интелигентните системи.' } },
    { type: 'Markdown', props: { value: 'Обучението развива както силни програмни умения, така и необходимия математически апарат за работа с алгоритми, данни и модели.' } },
    { type: 'Section', props: { title: 'Какво ще учиш', description: '', markdown: '* основи на алгоритмите и математиката за AI;\n* машинно обучение и невронни мрежи;\n* обработка и анализ на данни;\n* роботика и интелигентни системи;\n* разработване на софтуерни решения с вграден изкуствен интелект.' } },
  ] },
  { slug: 'priem/red-i-uslovija-za-priem', blocks: [
    { type: 'Markdown', props: { value: 'В ТУЕС към ТУ – София могат да кандидатстват ученици от цялата страна, завършили 7. клас. Приемът се извършва по държавния план-прием и е обвързан с резултатите от националното външно оценяване и класирането в електронната система.' } },
    { type: 'Section', props: { title: 'Формиране на бала', description: '', markdown: 'Балообразуването включва комбинация от оценките по български език и литература и математика от НВО, както и годишните оценки по определени предмети от свидетелството за 7. клас. Точната формула и коефициенти се публикуват всяка година.' } },
    { type: 'Section', props: { title: 'Специалности', description: '', markdown: '* Системно програмиране;\n* Компютърни мрежи;\n* Програмиране на изкуствен интелект.' } },
    { type: 'Section', props: { title: 'Документи за записване', description: '', markdown: 'При записване се изискват свидетелство за основно образование, медицинско удостоверение и други документи съгласно указанията на училището и действащата нормативна уредба. Актуален списък и срокове се публикуват ежегодно на тази страница.' } },
  ] },
  { slug: 'tues-talks', blocks: [
    { type: 'Markdown', props: { value: 'TUES Talks е ученически подкаст и формат за разговори, в който ученици, възпитаници, преподаватели и гости от ИТ индустрията споделят опит, идеи и истории за технологии, образование и личностно развитие.' } },
    { type: 'Markdown', props: { value: 'В епизодите се обсъждат теми като избор на специалност и университет, първи стъпки в ИТ сектора, интересни проекти и вдъхновяващи кариерни пътища на туесари в България и чужбина.' } },
    { type: 'Section', props: { title: 'Какво ще намерите тук', description: '', markdown: 'Информация за формата, екипа зад TUES Talks и линкове към публикуваните епизоди в различни платформи. Новите издания се анонсират и в секцията „Новини“ на сайта.' } },
  ] },
];

async function ensureParent(locale, slug, title) {
  // Ensure a parent folder exists for a section slug, return its id
  const existing = await prisma.page.findUnique({ where: { slug_locale: { slug, locale } }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.page.create({
    data: {
      slug,
      locale,
      title,
      navLabel: title,
      kind: 'FOLDER',
      published: true,
      order: 0,
      visible: true,
      groupId: gid('G|section')
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertOne(item) {
  const locale = 'bg';
  const fullSlug = item.slug === '' ? 'home' : item.slug;

  // Validate/normalize blocks
  const val = validateBlocks(item.blocks);
  if (!val.valid) {
    console.warn(`[warn] ${fullSlug}: block validation errors:`, val.errors);
  }

  // Try exact full-slug match first
  let page = await prisma.page.findUnique({ where: { slug_locale: { slug: fullSlug, locale } } });

  // If not found and slug contains a '/', try hierarchical under parent
  if (!page && fullSlug.includes('/')) {
    const [section, leaf] = fullSlug.split('/');
    const parentId = await ensureParent(locale, section, section);
    page = await prisma.page.findFirst({ where: { locale, parentId, slug: leaf } });
    if (!page) {
      // Create as child under parent
      const title = inferTitleFromBlocks(item.blocks, leaf);
      page = await prisma.page.create({ data: {
        slug: leaf,
        locale,
        title,
        navLabel: title,
        parentId,
        kind: 'PAGE',
        published: true,
        order: 0,
        visible: true,
        groupId: gid(),
        blocks: val.normalized,
      }});
      return page;
    }
  }

  if (!page) {
    // Create top-level (home or single segment)
    const leaf = fullSlug;
    const title = inferTitleFromBlocks(item.blocks, leaf || 'Начало');
    page = await prisma.page.create({ data: {
      slug: leaf,
      locale,
      title,
      navLabel: title,
      kind: 'PAGE',
      published: true,
      order: 0,
      visible: true,
      groupId: gid(),
      blocks: val.normalized,
    }});
    return page;
  }

  // Update existing
  const title = page.title || inferTitleFromBlocks(item.blocks, fullSlug);
  await prisma.page.update({ where: { id: page.id }, data: { title, navLabel: page.navLabel ?? title, blocks: val.normalized, published: true } });
  return page;
}

async function run() {
  try {
    console.log(`Importing ${input.length} BG pages with blocks…`);
    for (const item of input) {
      const p = await upsertOne(item);
      console.log('✓', (item.slug || 'home'), '->', p.id);
    }
    console.log('Done.');
  } catch (err) {
    console.error('Import error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
