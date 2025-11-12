"use client";

import React from "react";

export function StickyApplyCta({ label, href }: { label: string; href: string }) {
  if (!label || !href) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto mb-3 flex justify-center px-3 md:hidden">
      <a
        href={href}
        className="w-full max-w-md rounded-full bg-brand-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-brand-600/30 ring-1 ring-brand-700/50 backdrop-blur hover:bg-brand-700"
      >
        {label}
      </a>
    </div>
  );
}
