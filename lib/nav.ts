export interface NavItem { label: string; href?: string; children?: { label: string; href: string }[] }

export const nav: NavItem[] = [
  { label: 'Новини', href: '/novini' },
  { label: 'Прием', children: [
    { label: 'Защо ТУЕС', href: '/priem/zashto-da-izbera-tues' },
    { label: 'Ред и условия', href: '/priem/red-i-uslovija-za-priem' }
  ]},
  { label: 'Обучение', children: [
    { label: 'Професионално образование', href: '/obuchenie/profesionalno-obrazovanie' },
    { label: 'Учебна програма', href: '/obuchenie/uchebna-programa' },
    { label: 'Учебна практика', href: '/obuchenie/uchebna-praktika' }
  ]},
  { label: 'Училището', children: [
    { label: 'Мисия', href: '/uchilishteto/misija' },
    { label: 'Контакти', href: '/uchilishteto/kontakti' }
  ]},
  { label: 'Ученически живот', href: '/uchenicheski-zhivot' },
  { label: 'Блог', href: '/blog' },
  { label: 'Европроекти', href: '/evroproekti' },
];
