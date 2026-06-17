#!/usr/bin/env node
/**
 * Generate `app/styles/tokens.css` from `design/tokens.json`.
 *
 * tokens.json is the canonical source of truth for token VALUES
 * (design-system.md §5). This script is the code projection of the
 * Color / Spacing / Radius / Typography collections:
 *   - light values come from each token's `$value`
 *   - dark values come from `$extensions.dark`
 *   - `{primitive.*}` aliases are resolved to concrete primitives
 *   - CSS variable names come from `$extensions.css`
 *
 * Re-run after any tokens.json change:  pnpm tokens:generate
 * Never hand-edit the generated stylesheet — edit tokens.json and regenerate.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "..");
const SRC = resolve(ROOT, "design/tokens.json");
const OUT = resolve(ROOT, "app/styles/tokens.css");

const tokens = JSON.parse(readFileSync(SRC, "utf8"));

/** Resolve a value that may be a `{dot.path}` alias into a concrete primitive. */
function resolveValue(value) {
  if (typeof value !== "string") return value;
  const m = value.match(/^\{(.+)\}$/);
  if (!m) return value; // already a literal (hex / dimension)
  let node = tokens;
  for (const key of m[1].split(".")) node = node?.[key];
  if (node?.$value === undefined) throw new Error(`Unresolved alias {${m[1]}}`);
  return resolveValue(node.$value);
}

/** `var(--color-bg-page)` -> `--color-bg-page`. */
function cssVarName(extCss) {
  const m = String(extCss).match(/var\((--[^)]+)\)/);
  if (!m) throw new Error(`Malformed $extensions.css: ${extCss}`);
  return m[1];
}

const isInlineHex = (raw) => typeof raw === "string" && raw.startsWith("#");
const entries = (obj) => Object.entries(obj).filter(([k]) => !k.startsWith("$"));

// Values defined inline (not backed by a primitive) — reported for review.
const inlineNotes = [];

// ---- Semantic colours (light :root + dark [data-theme="dark"]) ----------
const COLOR_GROUPS = ["bg", "text", "action", "border", "status", "tag-tint", "tag-ink"];
const lightColor = [];
const darkColor = [];
for (const group of COLOR_GROUPS) {
  for (const [, tok] of entries(tokens.color[group])) {
    const cssName = cssVarName(tok.$extensions.css);
    if (isInlineHex(tok.$value)) inlineNotes.push(`${cssName} (light) = ${tok.$value}`);
    lightColor.push(`  ${cssName}: ${resolveValue(tok.$value)};`);
    const darkRaw = tok.$extensions?.dark;
    if (darkRaw !== undefined) {
      if (isInlineHex(darkRaw)) inlineNotes.push(`${cssName} (dark) = ${darkRaw}`);
      darkColor.push(`  ${cssName}: ${resolveValue(darkRaw)};`);
    }
  }
}

// ---- Solid tag colours (Badge dots / accents) — single mode -------------
const tagSolid = entries(tokens.tag).map(
  ([, tok]) => `  ${cssVarName(tok.$extensions.css)}: ${resolveValue(tok.$value)};`,
);

// ---- Spacing & radius (flat dimensions) ---------------------------------
const spacing = entries(tokens.spacing).map(([name, tok]) => `  --spacing-${name}: ${tok.$value};`);
const radius = entries(tokens.radius).map(([name, tok]) => `  --radius-${name}: ${tok.$value};`);

// ---- Type scale — 10 utility classes ------------------------------------
const HEADING_KEYS = new Set(["display", "h1", "h2", "h3", "h4"]);
const typo = entries(tokens.typography.scale).map(([name, tok]) => {
  const v = tok.$value;
  const family = HEADING_KEYS.has(name) ? "var(--font-heading)" : "var(--font-body)";
  const lines = [
    `  font-family: ${family};`,
    `  font-size: ${v.fontSize};`,
    `  line-height: ${v.lineHeight};`,
    `  font-weight: ${v.fontWeight};`,
  ];
  if (v.letterSpacing) lines.push(`  letter-spacing: ${v.letterSpacing};`);
  if (v.textCase === "uppercase") lines.push(`  text-transform: uppercase;`);
  return `.text-${name} {\n${lines.join("\n")}\n}`;
});

const css = `/* =========================================================================
 * GENERATED FILE — DO NOT EDIT BY HAND.
 * Source of truth: design/tokens.json (design-system.md §5).
 * Regenerate: pnpm tokens:generate
 * Light values from $value; dark values from $extensions.dark.
 * Font families (--font-heading / --font-body) are wired in app/globals.css
 * (Inter/Manrope stand-ins until M1.1 resolves the licensed Cyrillic families).
 * ========================================================================= */

:root {
  /* Colours — light */
${lightColor.join("\n")}

  /* Tag solids (Badge dots) — single mode */
${tagSolid.join("\n")}

  /* Spacing — 4px base */
${spacing.join("\n")}

  /* Radius */
${radius.join("\n")}
}

[data-theme="dark"] {
  /* Colours — dark */
${darkColor.join("\n")}
}

/* Type scale — 10 styles. Headings use --font-heading; text uses --font-body. */
${typo.join("\n\n")}
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, css, "utf8");

console.log(`Wrote ${OUT}`);
console.log(
  `  ${lightColor.length} colour vars · ${tagSolid.length} tag solids · ` +
    `${spacing.length} spacing · ${radius.length} radius · ${typo.length} text styles`,
);
if (inlineNotes.length) {
  console.warn(`\n${inlineNotes.length} inline literal(s) (not backed by a primitive alias):`);
  for (const n of inlineNotes) console.warn(`  - ${n}`);
}
