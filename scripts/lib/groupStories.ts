import type { Article, GroupedArticle } from "../types";

/**
 * scripts/lib/groupStories.ts
 * ---------------------------
 * Cluster articles that are covering the same story, using Jaccard similarity
 * on title token sets. Threshold >= 0.4 was tuned on real news data to catch
 * "Two outlets covered the same CVE" without merging unrelated posts.
 *
 * Cluster primary selection uses the same priority*recency-decay score as the
 * router (see scripts/lib/router.ts), so the most operationally-relevant
 * version of a story is the one shown — not just the oldest critical-tagged
 * one.
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "for", "to", "of", "in", "on", "at",
  "by", "with", "is", "are", "was", "were", "be", "as", "that", "this", "it",
  "from", "after", "over", "into", "via", "your", "you", "we", "they", "their",
]);

function tokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

const THRESHOLD = 0.4;

// ---- Score (kept in sync with scripts/lib/router.ts) ----------------------

const PRIORITY_HALF_LIFE_HOURS = 72;

function clampPublishedAt(t: number): number {
  const now = Date.now();
  return t > now ? now : t;
}

function priorityRank(p: Article["priority"]): number {
  return p === "critical" ? 3 : p === "high" ? 2 : 1;
}

function articleScore(a: Article): number {
  const h = Math.max(0, (Date.now() - clampPublishedAt(a.publishedAt)) / 3_600_000);
  const rec = Math.pow(0.5, h / PRIORITY_HALF_LIFE_HOURS);
  return priorityRank(a.priority) * rec;
}

function byScore(a: Article, b: Article): number {
  const d = articleScore(b) - articleScore(a);
  if (d !== 0) return d;
  return clampPublishedAt(b.publishedAt) - clampPublishedAt(a.publishedAt);
}

/**
 * Group articles by story. Each input appears in exactly one output cluster;
 * the first (highest-scoring) item is the cluster's primary.
 */
export function groupStories(articles: Article[]): GroupedArticle[] {
  const sorted = [...articles].sort(byScore);
  const used = new Set<number>();
  const out: GroupedArticle[] = [];

  const tokenSets = sorted.map((a) => tokens(a.title));

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    const primary = sorted[i];
    const related: Article[] = [];
    used.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      if (sorted[j].source === primary.source) continue; // same outlet = not "also covered"
      if (jaccard(tokenSets[i], tokenSets[j]) >= THRESHOLD) {
        related.push(sorted[j]);
        used.add(j);
      }
    }

    out.push({ ...primary, related });
  }

  return out;
}

/** Cross-cluster similarity check used to compute the Trending section. */
export function titlesSimilar(a: string, b: string): boolean {
  return jaccard(tokens(a), tokens(b)) >= THRESHOLD;
}
