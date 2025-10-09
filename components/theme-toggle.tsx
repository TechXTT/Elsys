"use client";
import React, { useEffect, useState } from 'react';

export const ThemeToggle: React.FC = () => {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    // Ensure we toggle the class on <html> for Tailwind 'dark' variant
    const root = document.documentElement;
    if (dark) root.classList.add('dark'); else root.classList.remove('dark');
  }, [dark]);
  return (
    <button onClick={() => setDark(d=>!d)} className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
      {dark ? 'Светла' : 'Тъмна'}
    </button>
  );
};
