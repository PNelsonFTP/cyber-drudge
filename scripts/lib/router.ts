import { CATEGORIES, KEYWORDS, KEYWORD_AGNOSTIC_SOURCES } from "../sources";
import type { Article, CategoryBucket, CategoryId, GroupedArticle, TrendingStory } from "../types";
import { groupStories, titlesSimilar } from "./groupStories";
import {
  ageHours,
  articleScore,
  byScore,
  clampPublishedAt,
  elevatePriority,
  LEAD_MAX_AGE_HOURS,
  MIN_VISIBLE,
  TRENDING_MAX_AGE_HOURS,
} from "./score";

/**
 * scripts/lib/router.ts
 * ---------------------
 * The router takes a flat list of fetched articles and produces:
 *   1. Per-category buckets (with `articles` visible + `articlesAll` pool).
 *   2. A Trending section (stories covered by 2+ distinct outlets).
 *   3. A single lead story (biggest, most-priority, most-recent).
 *
 * Ranking math lives in scripts/lib/score.ts (shared with groupStories.ts).
 *
 * Caps:
 *   - Per-source GLOBAL cap (6) across the whole site, applied before routing.
 *   - Per-source WITHIN-category diversity cap (3-5 based on source count).
 *
 * Freshness:
 *   - Each category has its own maxAgeHours (hard cap) and softAgeHours
 *     (preferred window). Items older than softAgeHours only backfill a
 *     section if it would otherwise drop below MIN_VISIBLE.
 *
 * Importance:
 *   - KEV-referencing and "actively exploited" stories get a recency-gated
 *     boost and may have their display priority elevated to critical/high.
 */

const GLOBAL_PER_SOURCE_CAP = 6;

interface CategoryWindows {
  softAgeHours: number;
  maxAgeHours: number;
}

const DEFAULT_WINDOWS: CategoryWindows = { softAgeHours: 96, maxAgeHours: 240 };

function windowsFor(catId: CategoryId): CategoryWindows {
  const def = CATEGORIES.find((c) => c.id === catId);
  const soft = def?.softAgeHours ?? DEFAULT_WINDOWS.softAgeHours;
  const max = def?.maxAgeHours ?? DEFAULT_WINDOWS.maxAgeHours;
  return { softAgeHours: soft, maxAgeHours: max };
}

function diversityCap(totalDistinctSources: number): number {
  if (totalDistinctSources <= 2) return 5;
  if (totalDistinctSources <= 4) return 4;
  return 3;
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

const CVE_RE = /\bCVE-\d{4}-\d{4,7}\b/gi;

export function routeAll(
  rawArticles: Article[],
  kevSet: ReadonlySet<string> = new Set(),
): {
  categories: CategoryBucket[];
  trending: TrendingStory[];
  leadStory: GroupedArticle | null;
} {
  const now = Date.now();

  // Clamp future-dated articles (parse artifacts, e.g. CISA "expected" dates)
  // to "now" so they neither outrank real current articles nor display as
  // negative-age on the client.
  const clamped = rawArticles.map((a) =>
    a.publishedAt > now ? { ...a, publishedAt: now } : a,
  );

  // KEV + display-priority elevation pass. KEV flag flows into score via
  // importanceBoost and into elevatePriority for the displayed tier.
  const tagged = clamped.map((a) => {
    const hay = `${a.title} ${a.snippet ?? ""}`.toUpperCase();
    const cves = hay.match(new RegExp(CVE_RE.source.toUpperCase(), "g")) ?? [];
    const kev = cves.some((c) => kevSet.has(c));
    const elevated = elevatePriority({ ...a, kev });
    return { ...a, kev: kev || undefined, priority: elevated };
  });

  const capped = applyGlobalCap(tagged);

  // Route into categories. An article may appear in more than one category.
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
  const trending = computeTrending(allRouted, now);

  const categories: CategoryBucket[] = [];
  let leadCandidate: GroupedArticle | null = null;
  let leadCandidateScore = -Infinity;

  for (const def of CATEGORIES) {
    const pool = byCat.get(def.id) ?? [];
    if (pool.length === 0) {
      categories.push({
        id: def.id,
        label: def.label,
        column: def.column ?? "left",
        articles: [],
        articlesAll: [],
        sourceCount: 0,
      });
      continue;
    }

    const distinctSources = new Set(pool.map((a) => a.source)).size;
    const cap = diversityCap(distinctSources);
    const win = windowsFor(def.id);

    // Hard age cap for this category.
    const ageFiltered = pool.filter((a) => ageHours(a.publishedAt, now) <= win.maxAgeHours);

    // Group first (full pool within age cap), then sort by score.
    const groupedAll = groupStories(ageFiltered, now).sort((a, b) => byScore(a, b, now));

    // Starvation-aware visible fill: take fresh items first; only pull stale
    // items from the soft-window tail when the section would be too thin.
    const fresh = groupedAll.filter((g) => ageHours(g.publishedAt, now) <= win.softAgeHours);
    const stale = groupedAll.filter((g) => ageHours(g.publishedAt, now) > win.softAgeHours);

    const counts = new Map<string, number>();
    const visible: GroupedArticle[] = [];
    const pick = (list: GroupedArticle[]) => {
      for (const g of list) {
        if (visible.length >= 12) break;
        const c = counts.get(g.source) ?? 0;
        if (c >= cap) continue;
        counts.set(g.source, c + 1);
        visible.push(g);
      }
    };
    pick(fresh);
    if (visible.length < MIN_VISIBLE) pick(stale);

    categories.push({
      id: def.id,
      label: def.label,
      column: def.column ?? "left",
      articles: visible,
      articlesAll: groupedAll,
      sourceCount: distinctSources,
    });

    for (const g of groupedAll) {
      // Lead story: must be within LEAD_MAX_AGE_HOURS; fall back to overall
      // top only if no fresh candidate exists.
      const isFresh = ageHours(g.publishedAt, now) <= LEAD_MAX_AGE_HOURS;
      if (!isFresh && leadCandidate) continue;
      const sc = scoreOf(g, now);
      if (sc > leadCandidateScore) {
        leadCandidate = g;
        leadCandidateScore = sc;
      }
    }
  }

  // If the lead candidate is older than LEAD_MAX_AGE_HOURS (only happens when
  // the whole corpus is stale), accept it as-is rather than showing nothing.
  return { categories, trending, leadStory: leadCandidate };
}

function scoreOf(
  a: { priority: Article["priority"]; publishedAt: number; kev?: boolean; related?: { length: number } | unknown[] },
  now: number,
): number {
  return articleScore(a, now);
}

/** Apply the GLOBAL per-source cap, keeping the most-important items. */
function applyGlobalCap(articles: Article[]): Article[] {
  const now = Date.now();
  const sorted = [...articles].sort((a, b) => byScore(a, b, now));
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

/**
 * Trending stories = clusters of articles from 2+ distinct outlets where
 * titles are Jaccard-similar (>=0.4). Only items within TRENDING_MAX_AGE_HOURS
 * are eligible, so the Trending rail is always fresh.
 */
function computeTrending(all: Article[], now: number): TrendingStory[] {
  const fresh = all.filter((a) => ageHours(a.publishedAt, now) <= TRENDING_MAX_AGE_HOURS);

  const byUrl = new Map<string, Article>();
  for (const a of fresh) byUrl.set(a.url, a);
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
      const sorted = c.sort((a, b) => byScore(a, b, now));
      const primary = sorted[0];
      return {
        id: primary.id,
        title: primary.title,
        primaryUrl: primary.url,
        primarySource: primary.source,
        publishedAt: primary.publishedAt,
        sources: [...new Set(c.map((a) => a.source))],
        priority: primary.priority,
        kev: primary.kev,
      };
    })
    .sort((a, b) => {
      const srcCmp = b.sources.length - a.sources.length;
      if (srcCmp !== 0) return srcCmp;
      const sa = scoreOf(a, now);
      const sb = scoreOf(b, now);
      if (sb !== sa) return sb - sa;
      return clampPublishedAt(b.publishedAt, now) - clampPublishedAt(a.publishedAt, now);
    });
}
