import { CATEGORIES, KEYWORDS, KEYWORD_AGNOSTIC_SOURCES } from "../sources";
import type { Article, CategoryBucket, GroupedArticle, TrendingStory } from "../types";
import { groupStories, titlesSimilar } from "./groupStories";

/**
 * scripts/lib/router.ts
 * ---------------------
 * The router takes a flat list of fetched articles and produces:
 *   1. Per-category buckets (with `articles` visible + `articlesAll` pool).
 *   2. A Trending section (stories covered by 2+ distinct outlets).
 *   3. A single lead story (biggest, most-priority, most-recent).
 *
 * Caps:
 *   - Per-source GLOBAL cap of 6 across the entire site (applied FIRST,
 *     before routing, so one high-volume source cannot flood every category).
 *   - Per-source WITHIN-category diversity cap (3-5 based on category size).
 *
 * Multi-category routing:
 *   Each article is placed in its feed's home category PLUS any category whose
 *   keyword list matches its title+summary. Reddit/HN-style sources are exempt
 *     from keyword routing (see KEYWORD_AGNOSTIC_SOURCES) because their generic
 *   post titles match too broadly.
 *
 * Ranking (the key bit for cybersecurity):
 *   Articles are scored by a function that blends priority tier with a
 *   time-decay multiplier. Recency matters MORE here than on a general-news
 *   aggregator because cybersecurity is operational — a 9-day-old Patch
 *   Tuesday post should not be ranked above a fresh active-exploit story.
 *   Articles older than MAX_AGE_HOURS are dropped from visible sections.
 */

const GLOBAL_PER_SOURCE_CAP = 6;

/** Hard age cap for visible sections (14 days). Older articles are dropped. */
const MAX_AGE_HOURS = 14 * 24;

/** Half-life for the recency multiplier: at this age, priority weight halves. */
const PRIORITY_HALF_LIFE_HOURS = 72; // 3 days

/** Per-source cap inside a single category: bigger categories get a bit more. */
function diversityCap(totalDistinctSources: number): number {
  if (totalDistinctSources <= 2) return 5;
  if (totalDistinctSources <= 4) return 4;
  return 3;
}

function priorityRank(p: Article["priority"]): number {
  return p === "critical" ? 3 : p === "high" ? 2 : 1;
}

/**
 * Clamp parse artifacts (future dates) to "now" so they don't outrank real
 * current articles. CISA advisories in particular frequently publish a date
 * that's a few days in the future (an "expected" date), which would otherwise
 * pin them to the top of every section.
 */
function clampPublishedAt(t: number): number {
  const now = Date.now();
  return t > now ? now : t;
}

/**
 * Age of an article in hours (post-clamp, so always >= 0).
 */
function ageHours(t: number): number {
  return Math.max(0, (Date.now() - clampPublishedAt(t)) / 3_600_000);
}

/**
 * Recency multiplier in (0, 1]. Uses exponential decay so an article loses
 * half its priority weight every PRIORITY_HALF_LIFE_HOURS. A fresh article
 * scores 1.0; a 3-day-old scores 0.5; a 6-day-old scores 0.25; etc.
 */
function recencyMultiplier(t: number): number {
  const h = ageHours(t);
  return Math.pow(0.5, h / PRIORITY_HALF_LIFE_HOURS);
}

/**
 * Composite score used by every sort in the router. Priority tier sets the
 * base range, recency modulates within the tier, and cross-outlet coverage
 * adds a smaller bonus so genuinely big stories still bubble up.
 *
 *   critical: 3.0 * recency  (+ related bonus)
 *   high:     2.0 * recency  (+ related bonus)
 *   normal:   1.0 * recency  (+ related bonus)
 *
 * Net effect: a 9-day-old critical article (recency ~0.20) scores ~0.6,
 * losing to a fresh high article (~2.0) and even a fresh normal one (~1.0).
 */
function articleScore(a: { priority: Article["priority"]; publishedAt: number; related?: { length: number } }): number {
  const base = priorityRank(a.priority);
  const rec = recencyMultiplier(a.publishedAt);
  const relatedBonus = 0.04 * (a.related?.length ?? 0);
  return base * rec + relatedBonus;
}

/** Sort comparator: higher score first. */
function byScore(a: Article | GroupedArticle, b: Article | GroupedArticle): number {
  const sa = articleScore(a);
  const sb = articleScore(b);
  if (sb !== sa) return sb - sa;
  // Tiebreak: newest first.
  return clampPublishedAt(b.publishedAt) - clampPublishedAt(a.publishedAt);
}

/** Apply the GLOBAL per-source cap, keeping the most-important items. */
function applyGlobalCap(articles: Article[]): Article[] {
  const sorted = [...articles].sort(byScore);
  const counts = new Map<string, number>();
  const out: Article[] = [];
  for (const a of sorted) {
    const c = counts.get(a.source) ?? 0;
    if (c >= GLOBAL_PER_SOURCE_CAP) continue;
    counts.set(a.source, c + 1);
    out.push(a);
  }
  return out;
}

/** Find every category an article belongs in (home + keyword matches). */
function routeArticle(a: Article): Set<string> {
  const cats = new Set<string>([a.category]);
  if (KEYWORD_AGNOSTIC_SOURCES.has(a.source)) return cats;

  const hay = `${a.title} ${a.snippet ?? ""}`.toLowerCase();
  for (const rule of KEYWORDS) {
    if (rule.match.some((kw) => hay.includes(kw))) {
      cats.add(rule.routeTo);
    }
  }
  return cats;
}

export function routeAll(rawArticles: Article[]): {
  categories: CategoryBucket[];
  trending: TrendingStory[];
  leadStory: GroupedArticle | null;
} {
  const now = Date.now();

  // Clamp future-dated articles (parse artifacts, e.g. CISA "expected" dates)
  // to "now" so they neither outrank real current articles nor display as
  // negative-age on the client.
  const clamped = rawArticles.map((a) =>
    a.publishedAt > now ? { ...a, publishedAt: now } : a
  );

  // Drop articles older than the hard cap BEFORE doing anything else.
  const fresh = clamped.filter((a) => ageHours(a.publishedAt) <= MAX_AGE_HOURS);
  const capped = applyGlobalCap(fresh);

  const byCat = new Map<string, Article[]>();
  for (const a of capped) {
    for (const cat of routeArticle(a)) {
      const arr = byCat.get(cat) ?? [];
      arr.push(a);
      byCat.set(cat, arr);
    }
  }

  const allRouted: Article[] = [];
  for (const arr of byCat.values()) allRouted.push(...arr);
  const trending = computeTrending(allRouted);

  const categories: CategoryBucket[] = [];
  let leadCandidate: GroupedArticle | null = null;

  for (const def of CATEGORIES) {
    const pool = byCat.get(def.id) ?? [];
    const distinctSources = new Set(pool.map((a) => a.source)).size;
    const cap = diversityCap(distinctSources);

    // Group first (full pool), then diversity-cap per-source inside category.
    const groupedAll = groupStories(pool).sort(byScore);

    const counts = new Map<string, number>();
    const visible: GroupedArticle[] = [];
    for (const g of groupedAll) {
      const c = counts.get(g.source) ?? 0;
      if (c >= cap) continue;
      counts.set(g.source, c + 1);
      visible.push(g);
    }

    categories.push({
      id: def.id,
      label: def.label,
      column: def.column ?? "left",
      articles: visible,
      articlesAll: groupedAll,
      sourceCount: distinctSources,
    });

    for (const g of groupedAll) {
      // byScore(a,b) returns positive when b > a; we want to replace
      // leadCandidate when g is HIGHER-scoring, i.e. byScore(g, lead) < 0.
      if (!leadCandidate || byScore(g, leadCandidate) < 0) {
        leadCandidate = g;
      }
    }
  }

  return { categories, trending, leadStory: leadCandidate };
}

/**
 * Trending stories = clusters of articles from 2+ distinct outlets where
 * titles are Jaccard-similar (>=0.4). Same article routed into multiple
 * categories is deduped by URL before clustering. Trending ranking weights
 * coverage count heavily but still applies the recency multiplier.
 */
function computeTrending(all: Article[]): TrendingStory[] {
  const byUrl = new Map<string, Article>();
  for (const a of all) byUrl.set(a.url, a);
  const uniq = [...byUrl.values()];

  const clusters: Article[][] = [];
  const used = new Set<string>();

  for (const seed of uniq) {
    if (used.has(seed.url)) continue;
    const cluster: Article[] = [seed];
    used.add(seed.url);
    for (const cand of uniq) {
      if (used.has(cand.url)) continue;
      if (titlesSimilar(seed.title, cand.title)) {
        cluster.push(cand);
        used.add(cand.url);
      }
    }
    clusters.push(cluster);
  }

  return clusters
    .filter((c) => new Set(c.map((a) => a.source)).size >= 2)
    .map((c) => {
      const sorted = c.sort(byScore);
      const primary = sorted[0];
      return {
        id: primary.id,
        title: primary.title,
        primaryUrl: primary.url,
        primarySource: primary.source,
        publishedAt: primary.publishedAt,
        sources: [...new Set(c.map((a) => a.source))],
        priority: primary.priority,
      };
    })
    .sort((a, b) => {
      // Coverage count dominates, then per-article score, then recency.
      const srcCmp = b.sources.length - a.sources.length;
      if (srcCmp !== 0) return srcCmp;
      const sa = articleScore(a);
      const sb = articleScore(b);
      if (sb !== sa) return sb - sa;
      return clampPublishedAt(b.publishedAt) - clampPublishedAt(a.publishedAt);
    });
}
