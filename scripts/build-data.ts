import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchFeeds } from "./fetch-feeds";
import { scrapeSources } from "./scrape-sources";
import { fetchStocks } from "./fetch-stocks";
import { generateBrief } from "./generate-brief";
import { routeAll } from "./lib/router";
import type { CategoryBucket, FeedStat, HeadlinesPayload } from "./types";

/**
 * scripts/build-data.ts
 * ---------------------
 * Orchestrator. Run via `npm run build:data` (tsx).
 *
 *   1. Fetch RSS + scrape HTML in parallel.
 *   2. Route articles into categories + compute trending + lead story.
 *   3. Write minified JSON to public/data/{headlines,stocks,brief}.json.
 *
 * Graceful degradation: if the fetch phase produces 0 usable articles, we keep
 * the previous headlines.json (if any) and exit 0 so the deploy still ships.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "public", "data");
const HEADLINES_PATH = path.join(DATA_DIR, "headlines.json");
const STOCKS_PATH = path.join(DATA_DIR, "stocks.json");
const BRIEF_PATH = path.join(DATA_DIR, "brief.json");

async function main(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  console.log("[build:data] fetching feeds + scraping in parallel...");
  const [{ articles: feedArticles, stats: feedStats }, { articles: scraped, stats: scrapeStats }] =
    await Promise.all([fetchFeeds(), scrapeSources()]);

  const stats: FeedStat[] = [...feedStats, ...scrapeStats];
  const allArticles = [...feedArticles, ...scraped];
  console.log(
    `[build:data] fetched ${allArticles.length} articles from ${stats.filter((s) => s.ok).length}/${stats.length} sources`
  );

  if (allArticles.length === 0) {
    console.warn("[build:data] no articles — preserving previous headlines.json");
    return;
  }

  const { categories, trending, leadStory } = routeAll(allArticles);

  // Drop empty categories so the UI doesn't render dead columns.
  const nonEmpty: CategoryBucket[] = categories.filter((c) => c.articles.length > 0);

  const payload: HeadlinesPayload = {
    generatedAt: Date.now(),
    categories: nonEmpty,
    trending,
    leadStory,
    feedStats: stats,
  };

  await writeFile(HEADLINES_PATH, JSON.stringify(payload), "utf8");
  console.log(
    `[build:data] wrote ${HEADLINES_PATH} — ${nonEmpty.length} categories, ${trending.length} trending`
  );

  // Stocks: silent-fail to {} on any error.
  try {
    const stocks = await fetchStocks();
    await writeFile(STOCKS_PATH, JSON.stringify(stocks), "utf8");
    console.log(`[build:data] wrote ${STOCKS_PATH} — ${Object.keys(stocks).length} tickers`);
  } catch (e) {
    console.warn(`[build:data] stocks fetch failed: ${e instanceof Error ? e.message : e}`);
    await writeFile(STOCKS_PATH, "{}", "utf8");
  }

  // Brief: LLM if key set, otherwise curated. Both produce a usable payload.
  try {
    const brief = await generateBrief(payload);
    await writeFile(BRIEF_PATH, JSON.stringify(brief), "utf8");
    console.log(`[build:data] wrote ${BRIEF_PATH} — source=${brief.source}`);
  } catch (e) {
    console.warn(`[build:data] brief generation failed: ${e instanceof Error ? e.message : e}`);
    await writeFile(
      BRIEF_PATH,
      JSON.stringify({
        generatedAt: Date.now(),
        source: "curated",
        headline: payload.leadStory?.title ?? "Cybersecurity news today",
        bullets: [],
      }),
      "utf8"
    );
  }
}

// If a previous headlines.json exists and the new build blows up, keep it.
main().catch(async (e) => {
  console.error("[build:data] FATAL:", e);
  if (!existsSync(HEADLINES_PATH)) {
    // No previous state — write a minimal empty payload so the SPA can load.
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(
      HEADLINES_PATH,
      JSON.stringify({
        generatedAt: Date.now(),
        categories: [],
        trending: [],
        leadStory: null,
        feedStats: [],
      }),
      "utf8"
    );
  }
  process.exit(0); // never fail the build on data errors
});

// readFile kept imported in case a future revision wants to diff old vs new
// payloads before writing. Marked unused today.
void readFile;
