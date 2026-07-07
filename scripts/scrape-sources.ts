import { SCRAPE_SOURCES } from "./sources";
import type { Article, FeedStat, Priority } from "./types";
import { decodeEntities } from "./fetch-feeds";

/**
 * scripts/scrape-sources.ts
 * -------------------------
 * For vendor blogs that ship no usable RSS (typically SPA-only marketing
 * sites). Each ScrapeDef has a `cardPattern` regex that captures
 *   group(1) = link href
 *   group(2) = title text
 * from the raw listing-page HTML. Conservative caps + timeouts so a broken
 * scraper never blocks the build.
 */

const TIMEOUT_MS = 8000;

export interface ScrapeResult {
  articles: Article[];
  stats: FeedStat[];
}

export async function scrapeSources(): Promise<ScrapeResult> {
  if (SCRAPE_SOURCES.length === 0) return { articles: [], stats: [] };
  const results = await Promise.all(SCRAPE_SOURCES.map(scrapeOne));
  const articles: Article[] = [];
  const stats: FeedStat[] = [];
  for (const r of results) {
    articles.push(...r.articles);
    stats.push(r.stat);
  }
  return { articles, stats };
}

async function scrapeOne(def: (typeof SCRAPE_SOURCES)[number]): Promise<{
  articles: Article[];
  stat: FeedStat;
}> {
  const cap = def.maxItems ?? 10;
  let body: string | null = null;
  let lastErr: string | undefined;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(def.listingUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 CyberDrudgeBot/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) {
      lastErr = `HTTP ${res.status}`;
    } else {
      body = await res.text();
    }
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
  }

  if (!body) {
    return { articles: [], stat: { name: def.name, ok: false, count: 0, error: lastErr } };
  }

  const re = new RegExp(def.cardPattern, "g");
  const seen = new Set<string>();
  const articles: Article[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    // A zero-width match would otherwise loop forever (empty title hits
    // `continue`, so the cap-based break is unreachable).
    if (m.index === re.lastIndex) re.lastIndex++;
    let href = m[1];
    const titleRaw = m[2] ?? "";
    const title = decodeEntities(stripHtml(titleRaw)).trim();
    if (!title || title.length < 8) continue;
    if (!/^https?:\/\//i.test(href)) {
      // Resolve relative hrefs against the LISTING URL (not just its
      // origin) so path-relative links like "post.html" resolve correctly.
      try {
        href = new URL(href, def.listingUrl).toString();
      } catch {
        continue;
      }
    }
    if (!/^https?:\/\//i.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    const snippetGroup = def.snippetGroup;
    const snippetRaw = snippetGroup ? (m[snippetGroup] ?? "") : "";
    const snippet = decodeEntities(stripHtml(snippetRaw)).trim().slice(0, 400);
    articles.push({
      id: hashId(def.name + "|" + href),
      title,
      url: href,
      source: def.name,
      category: def.category,
      publishedAt: Date.now(),
      snippet: snippet || undefined,
      priority: (def.priority ?? "normal") as Priority,
    });
    if (articles.length >= cap) break;
  }
  return { articles, stat: { name: def.name, ok: true, count: articles.length } };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function hashId(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
