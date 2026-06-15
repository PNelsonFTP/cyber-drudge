import { useState } from "react";
import type { CategoryBucket } from "../lib/types";
import { Headline } from "./Headline";
import type { Article, GroupedArticle } from "../lib/types";

/**
 * src/components/CategoryColumn.tsx
 * --------------------------------
 * A category section. Header shows label, source count, "View all N", and a
 * mute-category X button. On mobile (<md) collapses into a tap-to-expand
 * accordion; always-expanded on desktop.
 */
export function CategoryColumn(props: {
  bucket: CategoryBucket;
  bookmarked: (id: string) => boolean;
  queued: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onToggleQueue: (id: string) => void;
  onMuteSource: (s: string) => void;
  onMuteCategory: (c: string) => void;
  onHover: (a: Article | GroupedArticle, rect: DOMRect) => void;
  onHoverEnd: () => void;
}) {
  const { bucket } = props;
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visible: GroupedArticle[] = showAll ? bucket.articlesAll : bucket.articles;

  return (
    <section className="py-2 border-b border-[var(--color-line)] md:border-b">
      <header className="flex items-center gap-2 px-1">
        <button
          className="md:hidden mono text-xs text-[var(--color-muted)] caret-toggle"
          aria-label={expanded ? "Collapse section" : "Expand section"}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "\u25BE" : "\u25B8"}
        </button>
        <h2 className="font-bold uppercase text-[12px] tracking-wider mono">
          {bucket.label}
        </h2>
        <span className="text-[10px] mono text-[var(--color-muted)]">
          {bucket.sourceCount} src
        </span>
        <div className="ml-auto flex items-center gap-2">
          {bucket.articlesAll.length > bucket.articles.length && (
            <button
              className="text-[11px] mono text-[var(--color-link)] hover:underline"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll
                ? "show fewer"
                : `view all ${bucket.articlesAll.length}`}
            </button>
          )}
          <button
            className="text-[11px] mono text-[var(--color-muted)] hover:siren"
            title={`Mute ${bucket.label}`}
            onClick={() => props.onMuteCategory(bucket.id)}
          >
            {"\u2715"}
          </button>
        </div>
      </header>
      <div className={`${expanded ? "block" : "hidden"} md:block`}>
        {visible.length === 0 ? (
          <div className="px-1 py-2 text-[12px] text-[var(--color-muted)]">
            No items.
          </div>
        ) : (
          visible.map((a) => (
            <Headline
              key={a.id}
              article={a}
              bookmarked={props.bookmarked(a.id)}
              queued={props.queued(a.id)}
              onToggleBookmark={props.onToggleBookmark}
              onToggleQueue={props.onToggleQueue}
              onMuteSource={props.onMuteSource}
              onHover={props.onHover}
              onHoverEnd={props.onHoverEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}
