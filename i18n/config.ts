export const locales = ["bg", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "bg";

export const localePrefix = "always" as const;

const config = {
  locales: Array.from(locales),
  defaultLocale,
  localePrefix,
};

export default config;

