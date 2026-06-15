import { STOCK_TICKERS } from "./sources";
import type { StocksPayload } from "./types";

/**
 * scripts/fetch-stocks.ts
 * -----------------------
 * Pulls sector-relevant tickers from Stooq (free, no API key) with a Yahoo
 * Finance fallback. Any error is swallowed — the site ships an empty object
 * and the client silently hides the ticker bar.
 */

const TIMEOUT_MS = 5000;

interface Quote {
  price: number;
  change: number;
  changePct: number;
}

export async function fetchStocks(): Promise<StocksPayload> {
  const out: StocksPayload = {};
  await Promise.all(STOCK_TICKERS.map((t) => pullOne(t, out)));
  return out;
}

async function pullOne(symbol: string, sink: StocksPayload): Promise<void> {
  try {
    const q = await stooqQuote(symbol);
    if (q) {
      sink[symbol] = { ...q, symbol };
      return;
    }
  } catch {
    // fall through to Yahoo
  }
  try {
    const q = await yahooQuote(symbol);
    if (q) sink[symbol] = { ...q, symbol };
  } catch {
    // silent fail
  }
}

async function stooqQuote(symbol: string): Promise<Quote | null> {
  // Stooq CSV endpoint: symbol.US e.g. CRWD.US
  // Format string: s=symbol, d2=date, t2=time, o=open, h=high, l=low, c=close, v=vol
  const url = `https://stooq.com/q/l/?s=${symbol.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cells = lines[1].split(",");
    const open = parseFloat(cells[3]);
    const close = parseFloat(cells[6]);
    if (!Number.isFinite(close)) return null;
    const ref = Number.isFinite(open) ? open : close;
    const change = close - ref;
    return {
      price: close,
      change,
      changePct: ref !== 0 ? (change / ref) * 100 : 0,
    };
  } finally {
    clearTimeout(t);
  }
}

async function yahooQuote(symbol: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 CyberDrudgeBot/1.0" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; previousClose?: number } }> };
    };
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;
    const price = meta.regularMarketPrice;
    const prev = meta.previousClose ?? price;
    const change = price - prev;
    return { price, change, changePct: prev !== 0 ? (change / prev) * 100 : 0 };
  } finally {
    clearTimeout(t);
  }
}
