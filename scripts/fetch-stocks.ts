import { STOCK_TICKERS } from "./sources";
import type { StocksPayload } from "./types";

/**
 * scripts/fetch-stocks.ts
 * -----------------------
 * Pulls sector-relevant tickers from Yahoo Finance (free, no API key). Stooq
 * was previously used as primary but its CSV endpoint became unreliable
 * (404s on most US tickers), so Yahoo is now the sole source.
 *
 * Any error is swallowed — the site ships an empty object and the client
 * silently hides the ticker bar.
 */

const TIMEOUT_MS = 5000;

interface Quote {
  price: number;
  change: number;
  changePct: number;
}

export async function fetchStocks(): Promise<StocksPayload> {
  const out: StocksPayload = {};
  // Serial with a tiny delay to avoid Yahoo's per-IP rate limiter, which
  // returns 429s when you fire 7 requests in parallel from one runner.
  for (const sym of STOCK_TICKERS) {
    try {
      const q = await yahooQuote(sym);
      if (q) out[sym] = { ...q, symbol: sym };
    } catch {
      // silent fail; ticker just won't appear
    }
    await sleep(250);
  }
  return out;
}

async function yahooQuote(symbol: string): Promise<Quote | null> {
  // interval=1d&range=5d gives us a few days of closes so we always have a
  // previous-close even if the API omits `chartPreviousClose`.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=5d`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 CyberDrudgeBot/1.0" },
    });
    if (res.status === 429) return null; // rate limited
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
            regularMarketVolume?: number;
          };
          indicators?: {
            quote?: Array<{ close?: (number | null)[] }>;
          };
        }>;
      };
    };
    const result = json.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    const price = meta.regularMarketPrice;

    // Reference (previous close) selection. With range=5d,
    // meta.chartPreviousClose is the close BEFORE the 5-day window (~6
    // sessions ago), which wildly overstates the daily change — so the
    // second-to-last daily bar is the primary source (skipping null bars
    // Yahoo emits for halted days), then meta.previousClose, and
    // chartPreviousClose only as a last resort.
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    let priorBar: number | null = null;
    for (let i = closes.length - 2; i >= 0; i--) {
      const c = closes[i];
      if (typeof c === "number" && Number.isFinite(c)) {
        priorBar = c;
        break;
      }
    }
    const ref =
      priorBar ??
      meta.previousClose ??
      meta.chartPreviousClose ??
      price;

    const change = price - ref;
    return {
      price,
      change,
      changePct: ref !== 0 ? (change / ref) * 100 : 0,
    };
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
