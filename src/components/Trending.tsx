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
    <section className="my-2 border border-[var(--color-accent)] p-2">
      <div className="text-[10px] mono siren uppercase tracking-widest mb-1">
        {"\u25A0"} TRENDING — {props.stories.length} STORIES
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
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
