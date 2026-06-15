import { XMLParser } from "fast-xml-parser";
import { FEEDS } from "./sources";
import type { Article, FeedStat, Priority } from "./types";
import { parseFeedDate } from "./lib/timeAgo";

/**
 * scripts/fetch-feeds.ts
 * ---------------------
 * Parallel RSS/Atom fetcher. Each feed has an 8s timeout, 1 retry, and
 * rotates User-Agent headers to dodge naive bot blocks. Output is capped at
 * `maxItems` (default 15) per feed.
 *
 * Notable robustness:
 *   - HTML entity decoding (feeds leak &#8217; &amp; etc.)
 *   - fast-xml-parser entity-expansion limits raised 1000 -> 100000 so big
 *     Atom / GitHub release feeds parse without silent truncation.
 *   - GitHub release feed noise filter: pure version-tag titles
 *     ("v0.30.4", "b9637") are dropped unless they have >=3 real words.
 */

const PER_FEED_TIMEOUT_MS = 8000;
const PER_FEED_MAX_ITEMS = 15;
const MAX_RETRIES = 1;

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 CyberDrudgeBot/1.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 CyberDrudgeBot/1.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 CyberDrudgeBot/1.0",
];

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // The fast-xml-parser default of 1000 entity expansions silently drops
  // legitimate Atom feeds (GitHub releases, Reddit). Raise every cap.
  processEntities: {
    enabled: true,
    maxEntitySize: 100_000,
    maxTotalExpansions: 100_000,
    maxExpandedLength: 1_000_000,
    maxEntityCount: 100_000,
  },
});

export interface FetchFeedsResult {
  articles: Article[];
  stats: FeedStat[];
}

export async function fetchFeeds(): Promise<FetchFeedsResult> {
  const results = await Promise.all(FEEDS.map(fetchOne));
  const articles: Article[] = [];
  const stats: FeedStat[] = [];
  for (const r of results) {
    if (r.articles.length) articles.push(...r.articles);
    stats.push(r.stat);
  }
  return { articles, stats };
}

async function fetchOne(feed: (typeof FEEDS)[number]): Promise<{
  articles: Article[];
  stat: FeedStat;
}> {
  const cap = feed.maxItems ?? PER_FEED_MAX_ITEMS;

  let body: string | null = null;
  let lastErr: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), PER_FEED_TIMEOUT_MS);
    try {
      const res = await fetch(feed.url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": USER_AGENTS[attempt % USER_AGENTS.length],
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
      });
      clearTimeout(t);
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      body = await res.text();
      break;
    } catch (e) {
      clearTimeout(t);
      lastErr = e instanceof Error ? e.name + ": " + e.message : String(e);
      continue;
    }
  }

  if (!body) {
    return { articles: [], stat: { name: feed.name, ok: false, count: 0, error: lastErr } };
  }

  try {
    const parsed = xmlParser.parse(body);
    const items = extractItems(parsed);
    const articles: Article[] = [];
    for (const item of items.slice(0, cap)) {
      const rawTitle = str(item.title);
      const title = decodeEntities(stripHtml(rawTitle)).trim();
      if (!title) continue;
      if (isReleaseNoise(title)) continue;
      const link = pickLink(item.link);
      if (!link) continue;
      const snippetRaw = str(item.summary ?? item.description ?? item.content);
      const snippet = decodeEntities(stripHtml(snippetRaw)).trim().slice(0, 400);
      articles.push({
        id: hashId(feed.url + "|" + link + "|" + title),
        title,
        url: link,
        source: feed.name,
        category: feed.category,
        publishedAt: parseFeedDate(str(item.pubDate ?? item.published ?? item.updated)),
        snippet: snippet || undefined,
        priority: (feed.priority ?? "normal") as Priority,
      });
    }
    return {
      articles,
      stat: { name: feed.name, ok: true, count: articles.length },
    };
  } catch (e) {
    return {
      articles: [],
      stat: {
        name: feed.name,
        ok: false,
        count: 0,
        error: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

/** RSS 2.0 puts items at rss.channel.item[], Atom at feed.entry[]. */
function extractItems(parsed: unknown): Record<string, unknown>[] {
  const root = parsed as Record<string, unknown>;
  if (!root || typeof root !== "object") return [];
  const rss = root.rss as { channel?: { item?: unknown } } | undefined;
  if (rss?.channel?.item) {
    return asArray(rss.channel.item) as Record<string, unknown>[];
  }
  const feed = root.feed as { entry?: unknown } | undefined;
  if (feed?.entry) {
    return asArray(feed.entry) as Record<string, unknown>[];
  }
  return [];
}

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [x];
}

/** Atom <link href="..."/> becomes @_href after attribute prefixing. */
function pickLink(linkField: unknown): string | undefined {
  if (!linkField) return undefined;
  if (typeof linkField === "string") return linkField;
  if (Array.isArray(linkField)) {
    const href = linkField.find((l) => l && typeof l === "object" && (l as Record<string, unknown>)["@_href"]);
    if (href && typeof href === "object") {
      return (href as Record<string, unknown>)["@_href"] as string;
    }
    return undefined;
  }
  if (typeof linkField === "object") {
    const obj = linkField as Record<string, unknown>;
    return (obj["@_href"] as string) ?? (obj.text as string);
  }
  return undefined;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Coerce unknown feed values to strings safely. */
function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(str).join(" ");
  if (typeof v === "object") {
    // Some Atom feeds put the text inside { _: "..." } or { text: "..." }
    const obj = v as Record<string, unknown>;
    if (typeof obj._ === "string") return obj._;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj["@_value"] === "string") return obj["@_value"];
  }
  return "";
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};
const NUMERIC_ENTITY = /&#(\d+);/g;
const HEX_ENTITY = /&#x([0-9a-fA-F]+);/g;

/** Decode named + numeric HTML entities. fast-xml-parser handles most, but
 *  feeds leak raw entities into CDATA so we double-decode to be safe. */
export function decodeEntities(s: string): string {
  let out = s;
  for (const [k, v] of Object.entries(ENTITIES)) {
    out = out.split(k).join(v);
  }
  out = out.replace(NUMERIC_ENTITY, (_, n) => safeFromCodePoint(parseInt(n, 10)));
  out = out.replace(HEX_ENTITY, (_, h) => safeFromCodePoint(parseInt(h, 16)));
  return out;
}

function safeFromCodePoint(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return "";
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

/**
 * GitHub release feeds leak pure version tags as their own posts. Drop them
 * UNLESS the title has >=3 real words (e.g. "Release v5.10.1: Add Mistral
 * support" is kept, "v0.30.4" is dropped).
 */
function isReleaseNoise(title: string): boolean {
  const looksLikeVersion = /^[a-z]?\d+(\.\d+)+$/.test(title.trim().toLowerCase());
  if (!looksLikeVersion) return false;
  const wordCount = title
    .split(/[\s:,\-_/]+/)
    .filter((w) => /[a-z]/i.test(w) && !/^\d+(\.\d+)*$/.test(w)).length;
  return wordCount < 3;
}

function hashId(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
