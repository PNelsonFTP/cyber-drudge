import type { GroupedArticle } from "../lib/types";
import { timeAgo } from "../lib/timeAgo";

/**
 * src/components/LeadStory.tsx
 * ----------------------------
 * Center column anchor: the biggest, most-covered story of the cycle.
 * Siren-red treatment; "Also covered by" links underneath.
 */
export function LeadStory(props: {
  lead: GroupedArticle | null;
}) {
  if (!props.lead) return null;
  const ls = props.lead;
  return (
    <section className="py-3 border-b-2 border-[var(--color-accent)]">
      <div className="text-[10px] mono siren uppercase tracking-widest">
        {"\u25A0"} LEAD STORY
      </div>
      <h2 className="mt-1 text-xl md:text-2xl font-extrabold leading-tight siren">
        <a href={ls.url} target="_blank" rel="noopener noreferrer nofollow">
          {ls.title}
        </a>
      </h2>
      <div className="mt-1 text-[11px] mono text-[var(--color-muted)]">
        {ls.source} · {timeAgo(ls.publishedAt)}
      </div>
      {ls.snippet && (
        <p className="mt-2 text-[13px] text-[var(--color-fg)] opacity-90">
          {ls.snippet}
        </p>
      )}
      {ls.related.length > 0 && (
        <div className="mt-2 text-[11px] mono text-[var(--color-muted)]">
          <span className="underline">Also covered by:</span>{" "}
          {ls.related.slice(0, 6).map((r, i) => (
            <span key={r.id}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[var(--color-link)]"
              >
                {r.source}
              </a>
              {i < Math.min(ls.related.length, 6) - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
