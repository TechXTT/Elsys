// Shared slugifier (Cyrillic-preserving — slugs may contain Cyrillic, encoded in
// URLs). The final character-class strip removes anything that is not a
// lowercase latin letter, digit, Cyrillic letter, or hyphen.
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .trim()
    .toLowerCase()
    .replace(/[‐-―−]+/g, "-") // various dashes -> hyphen
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9Ѐ-ӿ-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
