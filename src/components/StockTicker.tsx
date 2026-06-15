import type { StocksPayload } from "../lib/types";

/**
 * src/components/StockTicker.tsx
 * ------------------------------
 * Dark bar of sector-relevant tickers (CRWD, PANW, S, FTNT, etc). Green
 * triangles up for gainers, red down for losers. Hidden entirely if the
 * build produced no quotes.
 */
export function StockTicker(props: { quotes: StocksPayload }) {
  const entries = Object.entries(props.quotes);
  if (entries.length === 0) return null;
  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="overflow-x-auto whitespace-nowrap px-2 py-1">
        {entries.map(([sym, q]) => {
          const up = q.change >= 0;
          return (
            <span
              key={sym}
              className="mono text-[11px] inline-flex items-center gap-1 mr-4"
            >
              <span className="text-[var(--color-muted)]">{sym}</span>
              <span>${q.price.toFixed(2)}</span>
              <span className={up ? "text-green-500" : "siren"}>
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
