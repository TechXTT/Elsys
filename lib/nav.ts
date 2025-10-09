export interface NavItem { label: string; href?: string; children?: { label: string; href: string }[] }

export const nav: NavItem[] = [
  { label: 'Новини', href: '/novini' },
  { label: 'Прием', children: [
    { label: 'Защо ТУЕС', href: '/priem/zashto-da-izbera-tues' },
    { label: 'Ред и условия', href: '/priem/red-i-uslovija-za-priem' },
    { label: 'Специалност: Компютърни мрежи', href: '/priem/specialnost-komputyrni-mreji' },
    { label: 'Специалност: Изкуствен интелект', href: '/priem/specialnost-programirane-na-izkustven-intelekt' },
    { label: 'Специалност: Системно програмиране', href: '/priem/specialnost-sistemno-programirane' },
    { label: 'TUES Fest / Ден на отворените врати', href: '/priem/tues-fest-den-na-otvorenite-vrati' }
  ]},
  { label: 'Обучение', children: [
    { label: 'Професионално образование', href: '/obuchenie/profesionalno-obrazovanie' },
    { label: 'Учебна програма', href: '/obuchenie/uchebna-programa' },
    { label: 'Учебна практика по специалността', href: '/obuchenie/uchebna-praktika-po-specialnostta' },
    { label: 'Иновативен учебен подход', href: '/obuchenie/inovativen-ucheben-podhod' },
    { label: 'Интеграция с ТУ - София', href: '/obuchenie/integracija-s-tu-sofija' },
    { label: 'Дипломна работа', href: '/obuchenie/diplomna-rabota' },
    { label: 'Cisco академия', href: '/obuchenie/cisco-akademija' },
    { label: 'Investech Project', href: '/obuchenie/investech-project' },
    { label: 'Календар на събитията', href: '/obuchenie/kalendar-na-sabitijata' }
  ]},
  { label: 'Училището', children: [
    { label: 'Мисия', href: '/uchilishteto/misija' },
    { label: 'История', href: '/uchilishteto/istorija' },
    { label: 'ТУЕС в числа', href: '/uchilishteto/tues-v-chisla' },
    { label: 'Асоциация на завършилите ТУЕС', href: '/uchilishteto/asociacija-na-zavurshilite-tues' },
    { label: 'Лидери, завършили ТУЕС', href: '/uchilishteto/lideri-zavurshili-tues' },
    { label: 'Обществен съвет', href: '/uchilishteto/obshtestven-savet' },
    { label: 'Преподавателски екип', href: '/uchilishteto/prepodavatelski-ekip' },
    { label: 'Правилници и документи', href: '/uchilishteto/pravilnici-i-dokumenti' },
    { label: 'Галерия', href: '/uchilishteto/galerija' },
    { label: 'Контакти', href: '/uchilishteto/kontakti' }
  ]},
  { label: 'Ученически живот', children: [
    { label: 'Клубове', href: '/uchenicheski-zhivot/klubove' },
    { label: 'Hack TUES', href: '/uchenicheski-zhivot/hack-tues' },
    { label: 'TUES Talks', href: '/uchenicheski-zhivot/tues-talks' },
    { label: 'Inspiration Talks', href: '/uchenicheski-zhivot/inspiration-talks' },
    { label: 'Екскурзии', href: '/uchenicheski-zhivot/ekskurzii' },
    { label: 'Мнения за ТУЕС', href: '/uchenicheski-zhivot/mnenija-za-tues' },
    { label: 'Награди', href: '/uchenicheski-zhivot/nagradi' }
  ]},
  { label: 'Блог', href: '/blog' },
  { label: 'Европроекти', href: '/evroproekti' },
];
