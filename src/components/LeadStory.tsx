import type { GroupedArticle } from "../lib/types";
import { fullStamp, timeAgo } from "../lib/timeAgo";

/**
 * src/components/LeadStory.tsx
 * ----------------------------
 * Center column anchor: the biggest, most-covered story of the cycle.
 * Title uses the First Trust lead treatment (navy, tight tracking).
 * Critical stories stay siren red.
 */
export function LeadStory(props: {
  lead: GroupedArticle | null;
}) {
  if (!props.lead) return null;
  const ls = props.lead;
  const isKev = ls.kev === true;
  return (
    <section className="panel mb-4 pb-3 border-b border-[var(--color-line)]">
      <h2 className="section-heading">Lead Story</h2>
      <div>
        <h3>
          <a
            href={ls.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={`lead-title inline-block ${isKev || ls.priority === "critical" ? "headline-critical" : ""}`}
          >
            {ls.title}
          </a>
        </h3>
        <div className="mt-2 text-[11px] uppercase tracking-widest text-[var(--color-muted)] flex items-center gap-2 flex-wrap">
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
          <div className="mt-2 text-[11px] text-[var(--color-muted)]">
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
