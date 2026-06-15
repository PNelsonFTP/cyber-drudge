import type { TrendingStory } from "../lib/types";

/**
 * src/components/Trending.tsx
 * ---------------------------
 * Red-bordered box at the top of the page. Each story shows its title,
 * primary source, and a badge with the number of distinct outlets covering
 * it. Ranked by outlet-count then recency.
 */
export function Trending(props: { stories: TrendingStory[] }) {
  if (props.stories.length === 0) return null;
  const top = props.stories.slice(0, 8);
  return (
    <section className="mb-6">
      <header className="section-bar flex items-center gap-2 px-3 py-2 mb-2">
        <span className="siren">{"\u25A0"}</span>
        <h2 className="font-bold uppercase text-[13px] tracking-wider mono">
          Trending
        </h2>
        <span className="text-[10px] mono section-meta">
          {props.stories.length} {props.stories.length === 1 ? "story" : "stories"}
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
                className="headline-link text-[13px]"
              >
                {s.title}
              </a>
              <span className="ml-2 inline-block text-[10px] mono siren border border-[var(--color-accent)] px-1 py-px">
                {s.sources.length} src
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
