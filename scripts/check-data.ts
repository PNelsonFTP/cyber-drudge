/**
 * scripts/check-data.ts
 * ---------------------
 * Post-build health gate. Reads public/data/headlines.json and prints a
 * report covering feed health, per-category freshness/source diversity,
 * HTML entity leaks, and per-source cap compliance. Exit code:
 *   - 0  by default (warn-only)
 *   - 1  when --strict is passed AND any check failed
 *
 * Run:  npm run build:check        (warn)
 *       npm run build:check -- --strict
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HeadlinesPayload } from "./types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEADLINES_PATH = path.resolve(__dirname, "..", "public", "data", "headlines.json");

const strict = process.argv.includes("--strict");

const warn = (msg: string) => console.log(`  WARN  ${msg}`);
const info = (msg: string) => console.log(`  ok    ${msg}`);
const fail = (msg: string) => {
  console.log(`  FAIL  ${msg}`);
  failed++;
};

let failed = 0;

async function main(): Promise<void> {
  const raw = await readFile(HEADLINES_PATH, "utf8");
  const p = JSON.parse(raw) as HeadlinesPayload;
  const now = p.generatedAt || Date.now();

  console.log(`\n=== cyber-drudge data health (${new Date(now).toISOString()}) ===\n`);

  // 1. Feed health
  const stats = p.feedStats ?? [];
  const okCount = stats.filter((s) => s.ok).length;
  const total = stats.length;
  const ratio = total === 0 ? 0 : okCount / total;
  console.log(`Feeds: ${okCount}/${total} ok (${(ratio * 100).toFixed(0)}%)`);
  const failing = stats.filter((s) => !s.ok || s.count === 0);
  for (const s of failing) {
    const why = s.ok ? "empty feed" : s.error ?? "error";
    (strict ? fail : warn)(`${s.name}: ${why}`);
  }
  if (ratio < 0.9 && total > 0) {
    (strict ? fail : warn)(`feed health ${(ratio * 100).toFixed(0)}% < 90% threshold`);
  } else if (failing.length === 0) {
    info("all feeds ok and non-empty");
  }

  // 2. Per-category freshness + source diversity
  console.log("\nCategories:");
  // Match a leaked entity anywhere in the title (the old anchored version
  // missed mid-string leaks like "Foo &amp; Bar").
  const entityLeak = /&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/i;
  let leakCount = 0;
  for (const c of p.categories) {
    const items = c.articles ?? [];
    const sources = new Set(items.map((a) => a.source));
    const ages = items.map((a) => (now - a.publishedAt) / 3_600_000);
    const med = ages.length === 0 ? NaN : ages.slice().sort((x, y) => x - y)[Math.floor(ages.length / 2)];
    const medStr = isNaN(med) ? "-" : `${med.toFixed(0)}h`;
    const tag = `  ${c.id.padEnd(22)} items=${String(items.length).padStart(2)}  src=${sources.size}  median=${medStr}`;
    console.log(tag);
    if (items.length === 0) warn(`${c.id}: empty section`);
    if (sources.size < 2 && items.length > 0) warn(`${c.id}: only ${sources.size} source(s)`);
    for (const a of items) {
      if (entityLeak.test(a.title)) {
        leakCount++;
        warn(`entity leak in "${a.title.slice(0, 60)}"`);
      }
    }
  }
  if (leakCount === 0) info("no HTML entity leaks in titles");

  // 3. Global per-source cap (6) sanity across visible items.
  // Note: an article can appear in multiple categories via keyword routing,
  // so we dedupe by URL before counting — otherwise a properly-capped feed
  // that keyword-routes into 2 sections would falsely show as 2x its real size.
  const perSource = new Map<string, Set<string>>();
  for (const c of p.categories) {
    for (const a of c.articles) {
      const set = perSource.get(a.source) ?? new Set<string>();
      set.add(a.url);
      perSource.set(a.source, set);
    }
  }
  let capViolations = 0;
  for (const [src, urls] of perSource) {
    if (urls.size > 6) {
      capViolations++;
      warn(`global cap exceeded: ${src} shows ${urls.size} unique URLs (>6)`);
    }
  }
  if (capViolations === 0) info("per-source global cap (6) respected");

  // 4. Lead + trending freshness
  if (p.leadStory) {
    const leadH = (now - p.leadStory.publishedAt) / 3_600_000;
    if (leadH > 96) warn(`lead story is ${leadH.toFixed(0)}h old (>96h)`);
  }
  for (const t of p.trending ?? []) {
    const h = (now - t.publishedAt) / 3_600_000;
    if (h > 72) warn(`trending "${t.title.slice(0, 40)}" is ${h.toFixed(0)}h old (>72h)`);
  }

  console.log(`\n${failed === 0 ? "PASS" : `FAIL (${failed} strict failure${failed === 1 ? "" : "s"})`}\n`);
  process.exit(strict && failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("check-data fatal:", e);
  process.exit(strict ? 1 : 0);
});
