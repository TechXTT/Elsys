"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Menu, Search, X } from "lucide-react";

import { Link, usePathname } from "@/i18n/routing";
import type { UiNavNode } from "@/lib/navigation-build";
import { SearchBar } from "@/components/ui/SearchBar";
import { cn } from "@/lib/cn";

import { LanguageSwitcher } from "./language-switcher";
import { NavDropdown } from "./nav-dropdown";
import { ThemeToggle } from "./theme-toggle";

type Tone = "brand" | "surface";

function MobileAccordion({
  item,
  isActive,
  onNavigate,
}: {
  item: UiNavNode;
  isActive: (href?: string) => boolean;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--color-border-default)]">
      <button
        type="button"
        data-ui="nav"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-[var(--spacing-sm)] text-body font-medium text-[var(--color-text-body)]"
      >
        <span>{item.label}</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <ul className="flex flex-col gap-[var(--spacing-2xs)] pb-[var(--spacing-sm)] pl-[var(--spacing-sm)]">
          {(item.children ?? []).map((child, idx) => (
            <li key={idx}>
              <Link
                data-ui="nav"
                href={child.href ?? "#"}
                aria-current={isActive(child.href) ? "page" : undefined}
                onClick={onNavigate}
                className="block rounded-[var(--radius-sm)] py-[var(--spacing-2xs)] text-body-sm text-[var(--color-text-link)]"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SiteHeader({ initialNav }: { initialNav?: UiNavNode[] }) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();
  const nav = initialNav ?? [];

  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const tone: Tone = scrolled ? "surface" : "brand";
  const onBrand = tone === "brand";
  const searchAction = `/${locale}/search`;

  const isActive = useCallback(
    (href?: string) => {
      if (!href || !pathname) return false;
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  // Scroll → surface state.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  // Drawer: focus trap, Esc, body scroll lock; focus first item on open.
  useEffect(() => {
    if (!drawerOpen) return;
    const panel = drawerRef.current;
    if (!panel) return;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
        return;
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, closeDrawer]);

  const logoColor = onBrand ? "text-[var(--color-text-on-brand)]" : "text-[var(--color-text-heading)]";
  // AA (M5.5): full on-brand text — opacity-80 dropped below 4.5:1 on the header.
  const tagColor = onBrand ? "text-[var(--color-text-on-brand)]" : "text-[var(--color-text-muted)]";
  const navLinkColor = onBrand ? "text-[var(--color-text-on-brand)]" : "text-[var(--color-text-body)]";
  const iconColor = onBrand ? "text-[var(--color-text-on-brand)]" : "text-[var(--color-text-body)]";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors",
        scrolled
          ? "border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)]"
          : "bg-[var(--color-bg-header)]",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[90rem] items-center gap-[var(--spacing-md)] px-[var(--spacing-md)] md:h-20 lg:gap-[var(--spacing-lg)] lg:px-[var(--spacing-xl)]">
        <Link href="/" aria-label={t("homeAria")} className="flex shrink-0 flex-col justify-center leading-tight no-underline">
          <span className={cn("text-h4 font-semibold", logoColor)}>{t("brandShort")}</span>
          <span className={cn("hidden whitespace-nowrap text-caption lg:block", tagColor)}>{t("tagline")}</span>
        </Link>

        <nav aria-label={t("menu")} className="ml-[var(--spacing-lg)] hidden min-w-0 items-center gap-[var(--spacing-md)] lg:flex">
          {nav.map((item, i) =>
            item.children?.length ? (
              <NavDropdown key={i} item={item} tone={tone} isActive={isActive} />
            ) : item.external ? (
              <a
                key={i}
                data-ui="nav"
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
                className={cn("whitespace-nowrap rounded-[var(--radius-sm)] text-body font-medium hover:underline", navLinkColor)}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={i}
                data-ui="nav"
                href={item.href ?? "#"}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-[var(--radius-sm)] text-body font-medium hover:underline",
                  navLinkColor,
                  isActive(item.href) && "underline",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        {/* Desktop right cluster (lg+): search icon (lg–xl) → pill (xl+), lang, theme */}
        <div className="ml-auto hidden items-center gap-[var(--spacing-md)] lg:flex">
          <Link
            data-ui="nav"
            href="/search"
            aria-label={t("search")}
            className={cn("inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] xl:hidden", iconColor)}
          >
            <Search aria-hidden size={20} />
          </Link>
          <div className="hidden w-48 xl:block">
            <SearchBar label={t("search")} placeholder={t("searchPlaceholder")} action={searchAction} />
          </div>
          <LanguageSwitcher tone={tone} />
          <ThemeToggle tone={tone} />
        </div>

        {/* Mobile cluster (< lg) */}
        <div className="ml-auto flex items-center gap-[var(--spacing-sm)] lg:hidden">
          <Link
            data-ui="nav"
            href="/search"
            aria-label={t("search")}
            className={cn("inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]", iconColor)}
          >
            <Search aria-hidden size={22} />
          </Link>
          <button
            ref={hamburgerRef}
            type="button"
            data-ui="nav"
            aria-label={t("openMenu")}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            onClick={() => setDrawerOpen(true)}
            className={cn("inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]", iconColor)}
          >
            <Menu aria-hidden size={24} />
          </button>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("drawerTitle")}>
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} aria-hidden />
          <div
            ref={drawerRef}
            id="mobile-drawer"
            className="absolute right-0 top-0 flex h-full w-[min(20rem,85vw)] flex-col overflow-y-auto bg-[var(--color-bg-surface)] p-[var(--spacing-lg)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-h4 font-semibold text-[var(--color-text-heading)]">{t("brandShort")}</span>
              <button
                type="button"
                data-ui="nav"
                aria-label={t("closeMenu")}
                onClick={closeDrawer}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-body)]"
              >
                <X aria-hidden size={24} />
              </button>
            </div>

            <div className="mt-[var(--spacing-md)]">
              <SearchBar label={t("search")} placeholder={t("searchPlaceholder")} action={searchAction} />
            </div>

            <nav aria-label={t("menu")} className="mt-[var(--spacing-md)] flex flex-col">
              {nav.map((item, i) =>
                item.children?.length ? (
                  <MobileAccordion key={i} item={item} isActive={isActive} onNavigate={() => setDrawerOpen(false)} />
                ) : (
                  <Link
                    key={i}
                    data-ui="nav"
                    href={item.href ?? "#"}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={() => setDrawerOpen(false)}
                    className="border-b border-[var(--color-border-default)] py-[var(--spacing-sm)] text-body font-medium text-[var(--color-text-body)]"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>

            <div className="mt-[var(--spacing-lg)] flex items-center justify-between border-t border-[var(--color-border-default)] pt-[var(--spacing-md)]">
              <LanguageSwitcher tone="surface" />
              <ThemeToggle tone="surface" />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
