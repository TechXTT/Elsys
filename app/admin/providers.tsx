"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { AdminLocaleProvider } from "./AdminLocaleProvider";

export default function AdminProviders({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return (
    <SessionProvider session={session}>
      <AdminLocaleProvider>
        {children}
      </AdminLocaleProvider>
    </SessionProvider>
  );
}
