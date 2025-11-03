"use client";

import { type ReactNode } from "react";

import { usePathname } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && <SiteHeader />}
      {children}
      {!isAdminRoute && <SiteFooter />}
    </>
  );
}
