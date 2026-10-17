import type { StocksPayload } from "../lib/types";

/**
 * src/components/StockTicker.tsx
 * ------------------------------
 * Navy ticker bar matching XPND DRUDGE. Symbols in FT gold; gainers green,
 * losers red. Hidden if no quotes.
 */
export function StockTicker(props: { quotes: StocksPayload }) {
  const entries = Object.entries(props.quotes);
  if (entries.length === 0) return null;
  return (
    <div className="ticker-bar">
      <div className="overflow-x-auto whitespace-nowrap px-2 py-1">
        {entries.map(([sym, q]) => {
          const up = q.change >= 0;
          return (
            <span
              key={sym}
              className="text-[11px] inline-flex items-center gap-1 mr-4"
            >
              <span className="ticker-sym">{sym}</span>
              <span>${q.price.toFixed(2)}</span>
              <span className={up ? "ticker-up" : "ticker-down"}>
                {up ? "\u25B2" : "\u25BC"}
                {Math.abs(q.changePct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
