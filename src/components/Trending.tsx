import type { TrendingStory } from "../lib/types";

/**
 * src/components/Trending.tsx
 * ---------------------------
 * Top-of-page trending stories. Section heading uses the Drudge-style
 * red underline; stories are ranked with a small "N src" related badge.
 */
export function Trending(props: { stories: TrendingStory[] }) {
  if (props.stories.length === 0) return null;
  const top = props.stories.slice(0, 8);
  return (
    <section className="mb-6">
      <header className="flex items-baseline gap-2 pb-1 mb-2 border-b-2 border-[var(--color-siren)]">
        <h2 className="section-heading" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
          Trending
        </h2>
        <span className="text-[10px] mono text-[var(--color-muted)]">
          {props.stories.length} {props.stories.length === 1 ? "story" : "stories"} · covered by 2+ outlets
        </span>
      </header>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 px-1">
        {top.map((s, i) => (
          <li key={s.id} className="flex items-start gap-2">
            <span className="mono text-[11px] text-[var(--color-muted)] mt-0.5 w-5 text-right">
              {i + 1}
            </span>
            <div className="flex-1">
              <a
                href={s.primaryUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={s.priority === "critical" ? "headline-critical" : "headline-high"}
              >
                {s.title}
              </a>
              <span className="related-badge" title={`${s.sources.length} outlets covering this`}>
                {s.sources.length} src
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
