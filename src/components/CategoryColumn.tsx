import { useState } from "react";
import type { CategoryBucket } from "../lib/types";
import { Headline } from "./Headline";
import type { Article, GroupedArticle } from "../lib/types";

/**
 * src/components/CategoryColumn.tsx
 * --------------------------------
 * A category section. Heading is the First Trust silver bar (navy rule),
 * matching XPND DRUDGE / AI DRUDGE. Source count and mute/view-all sit beside it.
 *
 * On mobile (<md) collapses into a tap-to-expand accordion; always-expanded
 * on desktop. Each section has bottom margin for breathing room.
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
    <section className="mb-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          className="section-heading flex-1 cursor-pointer select-none md:cursor-default"
          onClick={() => setExpanded((v) => !v)}
        >
          <button
            className="md:hidden caret-toggle"
            aria-label={expanded ? "Collapse section" : "Expand section"}
            aria-expanded={expanded}
            aria-controls={`section-${bucket.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? "\u25BE" : "\u25B8"}
          </button>
          {bucket.label}
        </h2>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--color-muted)] pb-1 shrink-0">
          <span>{bucket.sourceCount} src</span>
          {bucket.articlesAll.length > bucket.articles.length && (
            <button
              className="text-[var(--color-link)] hover:underline normal-case"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "fewer" : `all ${bucket.articlesAll.length}`}
            </button>
          )}
          <button
            className="hover:text-[var(--siren)]"
            title={`Mute ${bucket.label}`}
            onClick={() => props.onMuteCategory(bucket.id)}
          >
            {"\u2715"}
          </button>
        </div>
      </div>
      <div id={`section-${bucket.id}`} className={`${expanded ? "block" : "hidden"} md:block`}>
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
