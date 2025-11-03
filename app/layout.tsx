import "./globals.css";
import React from "react";
import { cookies } from "next/headers";

const themeInitializer = `(() => {
  try {
    const storageKey = "elsys-theme";
    const cookieMatch = document.cookie.match(/(?:^|; )theme=(dark|light)/);
    const cookieTheme = cookieMatch ? cookieMatch[1] : null;
    const stored = window.localStorage.getItem(storageKey);
    const storedTheme = stored === "dark" || stored === "light" ? stored : null;
    const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const desired = cookieTheme ?? storedTheme ?? (systemPrefersDark ? "dark" : "light");
    const root = document.documentElement;
    if (desired === "dark") {
      root.classList.add("dark");
      root.dataset.theme = "dark";
      window.localStorage.setItem(storageKey, "dark");
      if (cookieTheme !== "dark") {
        document.cookie = "theme=dark; path=/; max-age=31536000";
      }
    } else {
      root.classList.remove("dark");
      root.dataset.theme = "light";
      if (desired === "light") {
        window.localStorage.setItem(storageKey, "light");
        if (cookieTheme !== "light") {
          document.cookie = "theme=light; path=/; max-age=31536000";
        }
      } else {
        window.localStorage.removeItem(storageKey);
        if (cookieTheme) {
          document.cookie = "theme=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      }
    }
  } catch (error) {
    document.documentElement.classList.remove("dark");
    document.documentElement.dataset.theme = "light";
  }
})();`;

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale?: string };
}) {
  const themeCookie = cookies().get("theme")?.value;
  const initialTheme = themeCookie === "dark" || themeCookie === "light" ? themeCookie : undefined;
  const initialHtmlClass = initialTheme === "dark" ? "dark" : undefined;
  const initialDataTheme = initialTheme ?? undefined;

  return (
    <html className={initialHtmlClass} data-theme={initialDataTheme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body className="min-h-screen bg-white transition-colors duration-150 dark:bg-slate-950">
        {children}
      </body>
    </html>
  );
}


