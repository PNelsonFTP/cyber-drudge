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
 */

const GLOBAL_PER_SOURCE_CAP = 6;

/** Per-source cap inside a single category: bigger categories get a bit more. */
function diversityCap(totalDistinctSources: number): number {
  if (totalDistinctSources <= 2) return 5;
  if (totalDistinctSources <= 4) return 4;
  return 3;
}

function priorityRank(p: Article["priority"]): number {
  return p === "critical" ? 3 : p === "high" ? 2 : 1;
}

function byPriorityThenRecency(a: Article, b: Article): number {
  const p = priorityRank(b.priority) - priorityRank(a.priority);
  if (p !== 0) return p;
  return b.publishedAt - a.publishedAt;
}

/** Apply the GLOBAL per-source cap, keeping the most-important items. */
function applyGlobalCap(articles: Article[]): Article[] {
  const sorted = [...articles].sort(byPriorityThenRecency);
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
  const capped = applyGlobalCap(rawArticles);

  const byCat = new Map<string, Article[]>();
  for (const a of capped) {
    for (const cat of routeArticle(a)) {
      const arr = byCat.get(cat) ?? [];
      arr.push(a);
      byCat.set(cat, arr);
    }
  }

  // Trending is computed globally across all routed copies of each article
  // (deduped by URL), looking for stories covered by 2+ distinct sources.
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
    const groupedAll = groupStories(pool);

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

    // Lead story ranking: priority * 1M + (1 + related.length) * 10K + hour bucket.
    for (const g of groupedAll) {
      if (!leadCandidate) {
        leadCandidate = g;
        continue;
      }
      const rank =
        priorityRank(g.priority) * 1_000_000 +
        (1 + g.related.length) * 10_000 +
        Math.floor(g.publishedAt / 3_600_000);
      const leadRank =
        priorityRank(leadCandidate.priority) * 1_000_000 +
        (1 + leadCandidate.related.length) * 10_000 +
        Math.floor(leadCandidate.publishedAt / 3_600_000);
      if (rank > leadRank) leadCandidate = g;
    }
  }

  return { categories, trending, leadStory: leadCandidate };
}

/**
 * Trending stories = clusters of articles from 2+ distinct outlets where
 * titles are Jaccard-similar (>=0.4). Same article routed into multiple
 * categories is deduped by URL before clustering.
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
      const sorted = c.sort(byPriorityThenRecency);
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
      const srcCmp = b.sources.length - a.sources.length;
      if (srcCmp !== 0) return srcCmp;
      const pCmp = priorityRank(b.priority) - priorityRank(a.priority);
      if (pCmp !== 0) return pCmp;
      return b.publishedAt - a.publishedAt;
    });
}
