import React from 'react';

export const SiteFooter: React.FC = () => (
  <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <div className="container-page py-10 grid gap-8 md:grid-cols-3">
      <div>
        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
          <img src="/images/logo.svg" alt="ТУЕС" className="h-8 w-8" />
          ТУЕС към ТУ-София
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Технологично училище Електронни системи</p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Връзки</h3>
        <ul className="mt-2 space-y-1 text-sm">
          <li><a className="hover:underline text-slate-600 dark:text-slate-400" href="/novini">Новини</a></li>
          <li><a className="hover:underline text-slate-600 dark:text-slate-400" href="/priem">Прием</a></li>
          <li><a className="hover:underline text-slate-600 dark:text-slate-400" href="/uchilishteto">Училището</a></li>
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Контакти</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">София 1000, бул. Климент Охридски 8<br/>tues@elsys-bg.org</p>
      </div>
    </div>
    <div className="border-t border-slate-200 dark:border-slate-700">
      <div className="container-page py-4 text-xs text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} ТУЕС към ТУ-София</div>
    </div>
  </footer>
);


