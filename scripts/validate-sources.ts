/**
 * scripts/validate-sources.ts
 * ---------------------------
 * Live validation of every configured source. Run before/after editing
 * scripts/sources.ts to catch dead feeds, bot walls, and zombie blogs
 * (feed parses fine but hasn't posted in months).
 *
 * Checks:
 *   - Every FEEDS url: HTTP status, XML root, item count, newest-item age.
 *   - Every SCRAPE_SOURCES listing url: HTTP status + cardPattern match count.
 *   - CISA KEV endpoint: HTTP status + CVE count.
 *   - Every STOCK_TICKERS symbol: Yahoo chart endpoint returns a price.
 *
 * Run:  npm run validate:sources              (report only, exit 0)
 *       npm run validate:sources -- --strict  (exit 1 on any FAIL)
 *
 * Verdicts: ok / STALE (>45d since newest item) / EMPTY / FAIL.
 * STALE is a warning, not a failure — some quality sources post monthly.
 */

import { XMLParser } from "fast-xml-parser";
import { FEEDS, SCRAPE_SOURCES, STOCK_TICKERS } from "./sources";
import { parseFeedDate } from "./lib/timeAgo";

const TIMEOUT_MS = 15_000;
const STALE_DAYS = 45;
const CONCURRENCY = 8;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 CyberDrudgeBot/1.0";

const strict = process.argv.includes("--strict");

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: true,
});

interface Verdict {
  name: string;
  url: string;
  status: "ok" | "STALE" | "EMPTY" | "FAIL";
  detail: string;
}

async function fetchText(
  url: string,
  extraHeaders?: Record<string, string>,
): Promise<{ status: number; body: string }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        ...extraHeaders,
      },
    });
    const body = await res.text();
    return { status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}

function extractItems(parsed: unknown): Record<string, unknown>[] {
  const root = parsed as Record<string, unknown>;
  if (!root || typeof root !== "object") return [];
  const rss = root.rss as { channel?: { item?: unknown } } | undefined;
  if (rss?.channel?.item) {
    const it = rss.channel.item;
    return (Array.isArray(it) ? it : [it]) as Record<string, unknown>[];
  }
  const feed = root.feed as { entry?: unknown } | undefined;
  if (feed?.entry) {
    const en = feed.entry;
    return (Array.isArray(en) ? en : [en]) as Record<string, unknown>[];
  }
  return [];
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(str).join(" ");
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj._ === "string") return obj._;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj["#text"] === "string") return obj["#text"];
  }
  return "";
}

async function checkFeed(feed: (typeof FEEDS)[number]): Promise<Verdict> {
  try {
    // Honor per-feed headers exactly as fetch-feeds.ts does.
    const { status, body } = await fetchText(feed.url, feed.headers);
    if (status < 200 || status >= 300) {
      return { name: feed.name, url: feed.url, status: "FAIL", detail: `HTTP ${status}` };
    }
    const leading = body.slice(0, 512).trimStart().slice(0, 100);
    if (!/^<\?xml|<rss|<feed/i.test(leading)) {
      return { name: feed.name, url: feed.url, status: "FAIL", detail: "non-XML body (HTML/wall)" };
    }
    const items = extractItems(xmlParser.parse(body));
    if (items.length === 0) {
      return { name: feed.name, url: feed.url, status: "EMPTY", detail: "0 items in feed" };
    }
    let newest = 0;
    for (const it of items) {
      const d = parseFeedDate(str(it.pubDate ?? it.published ?? it.updated));
      if (d > newest) newest = d;
    }
    const ageDays = newest > 0 ? (Date.now() - newest) / 86_400_000 : Infinity;
    const ageStr = Number.isFinite(ageDays) ? `${ageDays.toFixed(1)}d` : "no dates";
    if (ageDays > STALE_DAYS) {
      return {
        name: feed.name,
        url: feed.url,
        status: "STALE",
        detail: `${items.length} items, newest ${ageStr} old`,
      };
    }
    return { name: feed.name, url: feed.url, status: "ok", detail: `${items.length} items, newest ${ageStr}` };
  } catch (e) {
    return {
      name: feed.name,
      url: feed.url,
      status: "FAIL",
      detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    };
  }
}

async function checkScrape(s: (typeof SCRAPE_SOURCES)[number]): Promise<Verdict> {
  try {
    const { status, body } = await fetchText(s.listingUrl);
    if (status < 200 || status >= 300) {
      return { name: s.name, url: s.listingUrl, status: "FAIL", detail: `HTTP ${status}` };
    }
    const re = new RegExp(s.cardPattern, "g");
    let count = 0;
    while (re.exec(body) !== null && count < 500) count++;
    if (count === 0) {
      return { name: s.name, url: s.listingUrl, status: "EMPTY", detail: "cardPattern matched 0 cards" };
    }
    return { name: s.name, url: s.listingUrl, status: "ok", detail: `${count} pattern matches` };
  } catch (e) {
    return {
      name: s.name,
      url: s.listingUrl,
      status: "FAIL",
      detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    };
  }
}

async function checkKev(): Promise<Verdict> {
  const url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
  try {
    const { status, body } = await fetchText(url);
    if (status !== 200) return { name: "CISA KEV", url, status: "FAIL", detail: `HTTP ${status}` };
    const json = JSON.parse(body) as { vulnerabilities?: unknown[] };
    const n = json.vulnerabilities?.length ?? 0;
    return n > 0
      ? { name: "CISA KEV", url, status: "ok", detail: `${n} CVEs` }
      : { name: "CISA KEV", url, status: "EMPTY", detail: "0 vulnerabilities" };
  } catch (e) {
    return { name: "CISA KEV", url, status: "FAIL", detail: e instanceof Error ? e.message : String(e) };
  }
}

async function checkTicker(sym: string): Promise<Verdict> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`;
  try {
    const { status, body } = await fetchText(url);
    if (status !== 200) return { name: `ticker ${sym}`, url, status: "FAIL", detail: `HTTP ${status}` };
    const json = JSON.parse(body) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }>; error?: { description?: string } };
    };
    const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (typeof price !== "number") {
      return {
        name: `ticker ${sym}`,
        url,
        status: "FAIL",
        detail: json.chart?.error?.description ?? "no price in response",
      };
    }
    return { name: `ticker ${sym}`, url, status: "ok", detail: `$${price.toFixed(2)}` };
  } catch (e) {
    return { name: `ticker ${sym}`, url, status: "FAIL", detail: e instanceof Error ? e.message : String(e) };
  }
}

async function pooled<T, R>(items: T[], fn: (t: T) => Promise<R>, limit: number): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main(): Promise<void> {
  console.log(`\n=== validate-sources (${new Date().toISOString()}) ===\n`);

  const [feedVerdicts, scrapeVerdicts, kev, tickerVerdicts] = await Promise.all([
    pooled(FEEDS, checkFeed, CONCURRENCY),
    pooled(SCRAPE_SOURCES, checkScrape, 2),
    checkKev(),
    pooled(STOCK_TICKERS, checkTicker, 2),
  ]);

  const all = [...feedVerdicts, ...scrapeVerdicts, kev, ...tickerVerdicts];
  for (const v of all) {
    console.log(`${v.status.padEnd(6)} ${v.name.padEnd(32)} ${v.detail}`);
  }

  const fails = all.filter((v) => v.status === "FAIL" || v.status === "EMPTY");
  const stale = all.filter((v) => v.status === "STALE");
  console.log(
    `\n${all.length} sources checked — ${all.length - fails.length - stale.length} ok, ${stale.length} stale, ${fails.length} failing`
  );
  if (fails.length) {
    console.log("\nFailing sources:");
    for (const v of fails) console.log(`  ${v.name}: ${v.detail}\n    ${v.url}`);
  }
  process.exit(strict && fails.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("validate-sources fatal:", e);
  process.exit(1);
});
