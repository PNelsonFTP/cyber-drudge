import type { GroupedArticle } from "../lib/types";
import { fullStamp, timeAgo } from "../lib/timeAgo";

/**
 * src/components/LeadStory.tsx
 * ----------------------------
 * Center column anchor: the biggest, most-covered story of the cycle.
 * Title uses the `.lead-title` treatment (mono, 22px, tight tracking).
 * Red-underline heading labels it as the LEAD STORY.
 */
export function LeadStory(props: {
  lead: GroupedArticle | null;
}) {
  if (!props.lead) return null;
  const ls = props.lead;
  const isKev = ls.kev === true;
  return (
    <section className="mb-6">
      <header className="flex items-baseline gap-2 pb-1 mb-3 border-b-2 border-[var(--color-siren)]">
        <span className="siren">{"\u25A0"}</span>
        <h2 className="section-heading" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
          Lead Story
        </h2>
      </header>
      <div className="px-1">
        <h3 className="lead-title siren">
          <a href={ls.url} target="_blank" rel="noopener noreferrer nofollow">
            {ls.title}
          </a>
        </h3>
        <div className="mt-1 text-[11px] mono text-[var(--color-muted)] flex items-center gap-2 flex-wrap">
          <span className="source-badge">{ls.source}</span>
          <span>{timeAgo(ls.publishedAt)}</span>
          <span className="opacity-70">({fullStamp(ls.publishedAt)})</span>
          {isKev && <span className="kev-badge">KEV</span>}
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
      </div>
    </section>
  );
}
