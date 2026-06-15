import type { DailyBrief } from "../lib/types";

/**
 * src/components/DailyBrief.tsx
 * -----------------------------
 * Short summary block. If `source === "llm"` we credit the model; otherwise
 * the brief is curated from trending + lead + top of each category.
 */
export function DailyBrief(props: { brief: DailyBrief | null }) {
  if (!props.brief) return null;
  const b = props.brief;
  return (
    <section className="mb-6">
      <header className="section-bar flex items-center gap-2 px-3 py-2 mb-2">
        <h2 className="font-bold uppercase text-[13px] tracking-wider mono">
          Daily Brief
        </h2>
        <span className="text-[10px] mono section-meta">
          {b.source === "llm" ? "AI summary" : "curated"}
        </span>
      </header>
      <div className="px-1">
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
