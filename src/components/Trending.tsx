import type { TrendingStory } from "../lib/types";

/**
 * src/components/Trending.tsx
 * ---------------------------
 * Top-of-page trending stories in the First Trust trend box.
 * Stories are ranked with a small "N src" related badge.
 */
export function Trending(props: { stories: TrendingStory[] }) {
  if (props.stories.length === 0) return null;
  const top = props.stories.slice(0, 8);
  return (
    <section className="trend-box">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-heading flex-1">Trending — covered by 2+ outlets</h2>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted)] shrink-0">
          {props.stories.length} {props.stories.length === 1 ? "story" : "stories"}
        </span>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        {top.map((s, i) => (
          <li key={s.id} className="flex items-start gap-2">
            <span className="font-bold text-[var(--siren)] leading-none w-5 text-right shrink-0">
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
              {s.kev && (
                <span className="kev-badge" title="References a CISA Known Exploited Vulnerability">
                  KEV
                </span>
              )}
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
