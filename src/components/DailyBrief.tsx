import type { DailyBrief } from "../lib/types";

/**
 * src/components/DailyBrief.tsx
 * -----------------------------
 * Short summary block at the top of the page, in the First Trust brief box.
 * `source === "llm"` is credited as "AI summary", otherwise "curated".
 */
export function DailyBrief(props: { brief: DailyBrief | null }) {
  if (!props.brief) return null;
  const b = props.brief;
  return (
    <section className="brief-box">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-heading flex-1">Daily Brief</h2>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] shrink-0">
          {b.source === "llm" ? "AI summary" : "curated"}
        </span>
      </div>
      <div>
        <div className="font-bold text-[14px]">{b.headline}</div>
        {b.bullets.length > 0 && (
          <ul className="mt-1 text-[12px] list-disc list-inside space-y-0.5">
            {b.bullets.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
