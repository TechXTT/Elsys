#!/usr/bin/env node
/* eslint-disable no-console */
// Wrapper for the visual-regression suite (M4.4). `--update` refreshes baselines.
import { spawnSync } from "node:child_process";

const update = process.argv.slice(2).includes("--update");
const env = { ...process.env };
if (update) {
  env.UPDATE_BASELINES = "1";
  console.log("Refreshing visual baselines (UPDATE_BASELINES=1)…");
}
const res = spawnSync("pnpm", ["exec", "playwright", "test", "-c", "playwright.visual.config.ts"], {
  stdio: "inherit",
  env,
});
process.exit(res.status ?? 1);
