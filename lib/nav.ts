export interface NavItem { label: string; href?: string; children?: { label: string; href: string }[] }

export const nav: NavItem[] = [
  { label: 'Новини', href: '/novini' },
  { label: 'Прием', children: [
    { label: 'Защо ТУЕС', href: '/priem/zashto-da-izbera-tues' },
    { label: 'Ред и условия', href: '/priem/red-i-uslovija-za-priem' }
  ]},
  { label: 'Обучение', href: '/obuchenie' },
  { label: 'Училището', href: '/uchilishteto' },
];
