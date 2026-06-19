"use client";

import { useTranslations } from "next-intl";

/**
 * i18n for the advanced news block editor. `t` resolves chrome strings under the
 * Admin.newsEditor namespace; `tr` translates a block-meta DISPLAY string
 * (label/description/placeholder/option label) via the flat `dict`, falling back
 * to the English config string when no entry exists (so a missing key never
 * throws and EN renders the config strings). Block `type` ids, field `name`s, and
 * option `value`s are NEVER passed through here — they stay as serialized keys.
 */
export function useBlockI18n() {
  const t = useTranslations("Admin.newsEditor");
  const dict = (t.raw("dict") ?? {}) as Record<string, string>;
  const tr = (s?: string | null) => (s == null ? "" : dict[s] ?? s);
  const category = (c: string) => t(`categories.${c}`);
  return { t, tr, category };
}
