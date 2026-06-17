import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

// pixelmatch/pngjs visual diff (M4.4). Self-contained baseline management so the
// suite is explicit (vs. Playwright's built-in toHaveScreenshot) and emits diff
// images on regression. UPDATE_BASELINES=1 refreshes baselines instead of diffing.

export const BASELINE_DIR = path.join(process.cwd(), "tests/visual/__baselines__");
export const DIFF_DIR = path.join(process.cwd(), "tests/visual/.diffs");
const UPDATE = process.env.UPDATE_BASELINES === "1";
// Allow a tiny fraction of pixels to differ (anti-aliasing/font hinting noise).
const MAX_DIFF_RATIO = 0.002;

export interface CompareResult {
  status: "baseline-written" | "match" | "regression";
  diffRatio?: number;
  diffPath?: string;
  note?: string;
}

export function compareToBaseline(name: string, current: Buffer): CompareResult {
  mkdirSync(BASELINE_DIR, { recursive: true });
  const baselinePath = path.join(BASELINE_DIR, `${name}.png`);

  if (UPDATE || !existsSync(baselinePath)) {
    writeFileSync(baselinePath, current);
    return { status: "baseline-written" };
  }

  const baseline = PNG.sync.read(readFileSync(baselinePath));
  const cur = PNG.sync.read(current);
  if (baseline.width !== cur.width || baseline.height !== cur.height) {
    mkdirSync(DIFF_DIR, { recursive: true });
    const diffPath = path.join(DIFF_DIR, `${name}.png`);
    writeFileSync(diffPath, current);
    return { status: "regression", note: `dimension change ${baseline.width}x${baseline.height} → ${cur.width}x${cur.height}`, diffPath };
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });
  const changed = pixelmatch(baseline.data, cur.data, diff.data, width, height, { threshold: 0.1 });
  const ratio = changed / (width * height);
  if (ratio > MAX_DIFF_RATIO) {
    mkdirSync(DIFF_DIR, { recursive: true });
    const diffPath = path.join(DIFF_DIR, `${name}.png`);
    writeFileSync(diffPath, PNG.sync.write(diff));
    return { status: "regression", diffRatio: ratio, diffPath };
  }
  return { status: "match", diffRatio: ratio };
}
