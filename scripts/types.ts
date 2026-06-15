import type { CategoryId, Priority } from "./sources";

export type { CategoryId, Priority } from "./sources";

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  category: CategoryId;
  publishedAt: number; // ms epoch, best-effort
  snippet?: string;
  priority: Priority;
}

export interface GroupedArticle extends Article {
  /** Other articles covering the same story (Jaccard >= 0.4). */
  related: Article[];
}

export interface TrendingStory {
  id: string;
  title: string;
  primaryUrl: string;
  primarySource: string;
  publishedAt: number;
  sources: string[];
  priority: Priority;
}

export interface CategoryBucket {
  id: CategoryId;
  label: string;
  column: "left" | "center" | "right";
  /** Visible items (after per-source diversity cap). */
  articles: GroupedArticle[];
  /** Full pool for "View all N" expansion. */
  articlesAll: GroupedArticle[];
  sourceCount: number;
}

export interface FeedStat {
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface HeadlinesPayload {
  generatedAt: number;
  categories: CategoryBucket[];
  trending: TrendingStory[];
  leadStory: GroupedArticle | null;
  feedStats: FeedStat[];
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

export type StocksPayload = Record<string, StockQuote>;

export interface DailyBrief {
  generatedAt: number;
  source: "llm" | "curated";
  headline: string;
  bullets: string[];
}
