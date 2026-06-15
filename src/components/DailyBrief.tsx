import type { DailyBrief } from "../lib/types";

/**
 * src/components/DailyBrief.tsx
 * -----------------------------
 * Short summary block at the top of the page. Red-underline heading;
 * `source === "llm"` is credited as "AI summary", otherwise "curated".
 */
export function DailyBrief(props: { brief: DailyBrief | null }) {
  if (!props.brief) return null;
  const b = props.brief;
  return (
    <section className="mb-6">
      <header className="flex items-baseline gap-2 pb-1 mb-2 border-b-2 border-[var(--color-siren)]">
        <h2 className="section-heading" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
          Daily Brief
        </h2>
        <span className="text-[10px] mono text-[var(--color-muted)]">
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
