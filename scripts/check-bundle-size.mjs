#!/usr/bin/env node
/**
 * Bundle budget gate.
 * Reads .next/app-build-manifest.json, sums the gzipped JS for each public
 * page, and exits 1 if any page exceeds BUDGET_BYTES.
 *
 * Target: ≤100 KB gzipped (see docs/PARITY_AND_IMPROVEMENT_PLAN.md §7.3).
 * Current allowance: 150 KB while we work toward the target.
 */
import { readFileSync } from "fs";
import { gzipSync } from "zlib";
import { join, resolve } from "path";

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const NEXT = join(ROOT, ".next");
const BUDGET_BYTES = 150_000; // 150 KB gzipped

const PUBLIC_PAGES = [
  "/[locale]/page",
  "/[locale]/news/page",
  "/[locale]/[...slug]/page",
];

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(NEXT, "app-build-manifest.json"), "utf8"));
} catch {
  console.error("No .next/app-build-manifest.json found — run pnpm build first.");
  process.exit(1);
}

const failures = [];

for (const page of PUBLIC_PAGES) {
  const chunks = (manifest.pages?.[page] ?? []).filter((c) => c.endsWith(".js"));
  if (chunks.length === 0) {
    console.warn(`  warn  ${page}: not found in manifest — skipping`);
    continue;
  }

  let totalGzip = 0;
  for (const chunk of chunks) {
    const content = readFileSync(join(NEXT, chunk));
    totalGzip += gzipSync(content).byteLength;
  }

  const kb = (totalGzip / 1024).toFixed(1);
  const budgetKb = (BUDGET_BYTES / 1024).toFixed(0);
  if (totalGzip > BUDGET_BYTES) {
    failures.push(`  FAIL  ${page}: ${kb} KB gzipped (budget ${budgetKb} KB)`);
  } else {
    console.log(`  ok    ${page}: ${kb} KB gzipped`);
  }
}

if (failures.length > 0) {
  console.error("\nBundle budget exceeded:");
  failures.forEach((f) => console.error(f));
  process.exit(1);
}

console.log("\nAll public routes within bundle budget.");
