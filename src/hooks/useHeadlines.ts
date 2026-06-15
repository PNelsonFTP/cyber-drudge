import { useEffect, useState } from "react";
import type { HeadlinesPayload, StocksPayload, DailyBrief } from "../lib/types";

/**
 * src/hooks/useHeadlines.ts
 * -------------------------
 * Stale-while-revalidate data loading. On first paint we render whatever the
 * sessionStorage cache has (instant for returning users), then silently
 * revalidate against the network. If the network fails while we have cache,
 * we keep the cache silently — no error UI.
 *
 * Three endpoints: headlines, stocks, brief. All loaded in parallel.
 */

const BASE = import.meta.env.BASE_URL; // e.g. "/cyber-drudge/"

const SS_KEYS = {
  headlines: "cyber-drudge:cache:headlines",
  stocks: "cyber-drudge:cache:stocks",
  brief: "cyber-drudge:cache:brief",
};

export function useHeadlines(): {
  data: HeadlinesPayload | null;
  stocks: StocksPayload;
  brief: DailyBrief | null;
  isStale: boolean;
  generatedAt: number | null;
} {
  const [headlines, setHeadlines] = useState<HeadlinesPayload | null>(() =>
    loadSession<HeadlinesPayload>(SS_KEYS.headlines)
  );
  const [stocks, setStocks] = useState<StocksPayload>(() =>
    loadSession<StocksPayload>(SS_KEYS.stocks) ?? {}
  );
  const [brief, setBrief] = useState<DailyBrief | null>(() =>
    loadSession<DailyBrief>(SS_KEYS.brief)
  );
  const [isStale, setIsStale] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setIsStale(true);

    Promise.all([
      fetchJson<HeadlinesPayload>(`${BASE}data/headlines.json`),
      fetchJson<StocksPayload>(`${BASE}data/stocks.json`),
      fetchJson<DailyBrief>(`${BASE}data/brief.json`),
    ])
      .then(([h, s, b]) => {
        if (cancelled) return;
        if (h) {
          setHeadlines(h);
          saveSession(SS_KEYS.headlines, h);
        }
        if (s) {
          setStocks(s);
          saveSession(SS_KEYS.stocks, s);
        }
        if (b) {
          setBrief(b);
          saveSession(SS_KEYS.brief, b);
        }
      })
      .catch(() => {
        // Network failure: if we have cache, keep it silently.
      })
      .finally(() => {
        if (!cancelled) setIsStale(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    data: headlines,
    stocks,
    brief,
    isStale,
    generatedAt: headlines?.generatedAt ?? null,
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function loadSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveSession<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable; non-fatal
  }
}
