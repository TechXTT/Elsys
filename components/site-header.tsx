"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { nav } from '../lib/nav';
import { ThemeToggle } from './theme-toggle';
import { usePathname } from 'next/navigation';

interface MobileSectionProps { label: string; children: React.ReactNode }
const MobileSection: React.FC<MobileSectionProps> = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o=>!o)} className="flex w-full items-center justify-between py-2 font-medium text-slate-700 dark:text-slate-200">
        <span>{label}</span><span className="text-xs">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="pl-3 pb-2 space-y-1">{children}</div>}
    </div>
  );
};

export const SiteHeader: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const pathname = usePathname();

  const clearTimers = () => {
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
  };

  const scheduleOpen = (i: number) => {
    clearTimers();
    openTimer.current = window.setTimeout(() => setOpenMenu(i), 80);
  };

  const scheduleClose = (i: number) => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      setOpenMenu(curr => curr === i ? null : curr);
    }, 220);
  };

  useEffect(() => () => clearTimers(), []);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-800 hover:text-brand-700 dark:text-slate-100 dark:hover:text-brand-300" aria-label="Начало">
          <img src="/images/logo.svg" alt="ТУЕС" className="h-8 w-8" />
          <span className="hidden sm:inline">ТУЕС</span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm" aria-label="Главно меню">
          {nav.map((item, i) => item.children ? (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => scheduleOpen(i)}
              onMouseLeave={() => scheduleClose(i)}
            >
              <button
                className={`font-medium transition hover:text-brand-600 focus:outline-none dark:hover:text-brand-300 ${openMenu===i ? 'text-brand-600 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}
                aria-haspopup="true"
                aria-expanded={openMenu===i}
                onFocus={() => scheduleOpen(i)}
                onBlur={(e) => {
                  if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) scheduleClose(i);
                }}
              >{item.label}</button>
              <div
                className={`absolute left-0 top-full z-30 mt-2 min-w-[14rem] rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800 ${openMenu===i ? 'opacity-100 visible' : 'invisible opacity-0'} transition-opacity`}
                role="menu"
                onMouseEnter={() => scheduleOpen(i)}
                onMouseLeave={() => scheduleClose(i)}
              >
                {item.children.map(c => (
                  <Link
                    key={c.href}
                    href={c.href!}
                    aria-current={pathname === c.href ? 'page':undefined}
                    className={`block rounded px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${pathname===c.href? 'bg-slate-100 font-semibold dark:bg-slate-700':''} text-slate-700 dark:text-slate-200`}
                  >{c.label}</Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href!}
              aria-current={pathname === item.href ? 'page':undefined}
              className={`font-medium transition hover:text-brand-600 dark:hover:text-brand-300 ${pathname===item.href? 'text-brand-600 dark:text-brand-300':'text-slate-700 dark:text-slate-200'}`}
            >{item.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(o=>!o)} className="md:hidden inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Меню</button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900" aria-label="Мобилно меню">
          <div className="space-y-4">
            {nav.map(item => item.children ? (
              <MobileSection key={item.label} label={item.label}>
                {item.children.map(c => (
                  <Link key={c.href} href={c.href!} className="block rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" onClick={()=>setMobileOpen(false)}>{c.label}</Link>
                ))}
              </MobileSection>
            ) : (
              <Link key={item.href} href={item.href!} className="block rounded px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" onClick={()=>setMobileOpen(false)}>{item.label}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
