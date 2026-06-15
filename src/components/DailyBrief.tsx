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
    <section className="my-2 p-2 bg-[var(--color-surface)] border-l-2 border-[var(--color-accent)]">
      <div className="text-[10px] mono uppercase tracking-widest text-[var(--color-muted)] mb-1">
        Daily Brief · {b.source === "llm" ? "AI summary" : "curated"}
      </div>
      <div className="font-bold text-[14px]">{b.headline}</div>
      {b.bullets.length > 0 && (
        <ul className="mt-1 text-[12px] list-disc list-inside space-y-0.5">
          {b.bullets.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
