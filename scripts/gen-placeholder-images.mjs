// Generates school-neutral SVG placeholder images for seeded content, so a fresh
// install renders no broken images. Self-hosted, solid-color, no stock-photo
// licensing risk. Re-run after adding a new seeded image reference:
//   node scripts/gen-placeholder-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// dir -> [basename, ...] ; keep in sync with prisma/seed.js image references.
const SETS = {
  "public/images/news": [
    "graduation-2026",
    "hackathon-2026",
    "robotics-lab",
    "olympiad-medals",
    "open-doors",
    "partnership",
    "football-victory",
    "alumni-meetup",
    "workshops",
  ],
  "public/images/carousel": ["admission-2026", "hack-tues"],
};

// ТУЕС school blue (legacy palette, PLAN.md R6).
const BG = "#2f9ad0";
const W = 1200;
const H = 630;

function titleize(slug) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function svg(label) {
  // Explicit width/height so <img>.naturalWidth is non-zero when loaded.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="56" fill="#ffffff" opacity="0.95">${label}</text>
</svg>
`;
}

let count = 0;
for (const [dir, names] of Object.entries(SETS)) {
  mkdirSync(join(ROOT, dir), { recursive: true });
  for (const name of names) {
    writeFileSync(join(ROOT, dir, `${name}.svg`), svg(titleize(name)));
    count++;
  }
}
console.log(`✓ Wrote ${count} placeholder SVGs`);
