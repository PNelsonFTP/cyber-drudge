import type { Article, Priority } from "../types";

/**
 * scripts/lib/score.ts
 * --------------------
 * Single source of truth for ranking. Consumed by scripts/lib/router.ts and
 * scripts/lib/groupStories.ts (which previously each had their own copy and
 * could drift apart).
 *
 * Ranking blends:
 *   (priorityRank + importanceBoost) * recencyMultiplier + relatedBonus
 *
 * - priorityRank: critical 3 / high 2 / normal 1 (feed-level).
 * - importanceBoost: additive, recency-gated, capped (see SIGNALS + KEV).
 * - recencyMultiplier: exponential decay, 0.5 every HALF_LIFE_HOURS.
 * - relatedBonus: small lift for stories covered by multiple outlets.
 *
 * Net effect: a fresh "actively exploited" high-priority story outranks a
 * stale critical one; importance can NOT resurrect old items because the
 * boost is multiplied by recency.
 */

/** Half-life for the recency multiplier. */
export const HALF_LIFE_HOURS = 48;

/** Trending eligibility: only items this fresh may appear in Trending. */
export const TRENDING_MAX_AGE_HOURS = 72;

/** Lead-story eligibility: prefer a story this fresh; fall back only if none. */
export const LEAD_MAX_AGE_HOURS = 96;

/** Minimum visible items per category before stale backfill kicks in. */
export const MIN_VISIBLE = 4;

/** Cap on the additive importance boost (recency still multiplies it down). */
export const MAX_IMPORTANCE_BOOST = 2.5;

export function clampPublishedAt(t: number, now: number = Date.now()): number {
  return t > now ? now : t;
}

export function ageHours(t: number, now: number = Date.now()): number {
  return Math.max(0, (now - clampPublishedAt(t, now)) / 3_600_000);
}

export function recencyMultiplier(t: number, now: number = Date.now()): number {
  return Math.pow(0.5, ageHours(t, now) / HALF_LIFE_HOURS);
}

export function priorityRank(p: Priority): number {
  return p === "critical" ? 3 : p === "high" ? 2 : 1;
}

export interface Scorable {
  priority: Priority;
  publishedAt: number;
  title?: string;
  snippet?: string;
  /** True when a referenced CVE is in CISA's KEV catalog. */
  kev?: boolean;
  related?: { length: number } | unknown[];
}

const SIGNALS: ReadonlyArray<{ re: RegExp; boost: number }> = [
  { re: /actively exploited|exploited in[\s-]?the[\s-]?wild|in-the-wild/i, boost: 1.5 },
  { re: /\bKEV\b|known exploited/i,                                              boost: 1.5 },
  { re: /zero[- ]day|0day|0-day/i,                                               boost: 1.2 },
  { re: /emergency directive|patch now|patch immediately|out[\s-]?of[\s-]?band/i, boost: 1.2 },
  { re: /unauth(enticated)?\s+rce|pre[\s-]?auth\s+rce|remote code execution/i,  boost: 1.0 },
  { re: /cvss[:\s]*(9(\.\d)?|10(\.0)?)/i,                                        boost: 0.9 },
  { re: /critical (flaw|vulnerability|bug)|critical security/i,                 boost: 0.7 },
  { re: /ransomware|extortion/i,                                                boost: 0.5 },
  {
    re: /\b\d{1,3}(,\d{3})*(\.\d+)?\s*(million|billion|m|bn|k)\b[^.!]{0,40}?(record|user|account|customer|patient|email)/i,
    boost: 0.6,
  },
];

/**
 * Additive importance boost. Includes KEV signal and a set of regex
 * importance cues drawn from title + snippet. Recency-multiplied later.
 */
export function importanceBoost(a: Scorable): number {
  const hay = `${a.title ?? ""} ${a.snippet ?? ""}`;
  let boost = a.kev ? 1.5 : 0;
  for (const s of SIGNALS) {
    if (s.re.test(hay)) boost += s.boost;
  }
  return Math.min(boost, MAX_IMPORTANCE_BOOST);
}

/**
 * Composite score. Same formula everywhere ranking happens.
 */
export function articleScore(a: Scorable, now: number = Date.now()): number {
  const base = priorityRank(a.priority) + importanceBoost(a);
  const rec = recencyMultiplier(a.publishedAt, now);
  const relatedArr = a.related as { length: number } | unknown[] | undefined;
  const relatedLen = Array.isArray(relatedArr) ? relatedArr.length : (relatedArr?.length ?? 0);
  const relatedBonus = 0.04 * relatedLen;
  return base * rec + relatedBonus;
}

/** Sort comparator: higher score first, tiebreak newest first. */
export function byScore(a: Scorable, b: Scorable, now: number = Date.now()): number {
  const d = articleScore(b, now) - articleScore(a, now);
  if (d !== 0) return d;
  return clampPublishedAt(b.publishedAt, now) - clampPublishedAt(a.publishedAt, now);
}

/**
 * Elevate display priority based on importance signals so the UI badge
 * reflects real-world urgency, not just the feed's default tier.
 */
export function elevatePriority(a: Pick<Article, "priority" | "kev"> & Scorable): Priority {
  const boost = importanceBoost(a);
  if ((a.kev ?? false) || boost >= 1.5) return "critical";
  if (boost >= 0.7) return "high";
  return a.priority;
}
