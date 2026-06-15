import { useState } from "react";
import type { Article, GroupedArticle } from "../lib/types";
import { timeAgo } from "../lib/timeAgo";

/**
 * src/components/Headline.tsx
 * ---------------------------
 * Single headline row. Visual tier comes from the article's `priority`:
 *   critical -> red + bold   (`.headline-critical`)
 *   high     -> bold         (`.headline-high`)
 *   normal   -> regular      (`.headline-medium`)
 * (low/opacity-0.85 tier reserved for muted/queued items)
 *
 * Source renders as an uppercase pill (`.source-badge`). If the article has
 * related coverage, a blue "+N" pill appears next to the source.
 */
const PRIORITY_CLASS: Record<Article["priority"], string> = {
  critical: "headline-critical",
  high: "headline-high",
  normal: "headline-medium",
};

export function Headline(props: {
  article: Article | GroupedArticle;
  bookmarked: boolean;
  queued: boolean;
  onToggleBookmark: (id: string) => void;
  onToggleQueue: (id: string) => void;
  onMuteSource: (source: string) => void;
  onHover?: (article: Article | GroupedArticle, rect: DOMRect) => void;
  onHoverEnd?: () => void;
}) {
  const { article: a } = props;
  const [mutedHint, setMutedHint] = useState(false);
  const priorityClass = PRIORITY_CLASS[a.priority] ?? "headline-medium";
  const relatedCount = "related" in a ? a.related.length : 0;

  return (
    <div
      className="group py-1.5 border-b border-[var(--color-line)] last:border-b-0"
      onMouseEnter={(e) => props.onHover?.(a, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => {
        setMutedHint(false);
        props.onHoverEnd?.();
      }}
    >
      <div className="flex items-start gap-1">
        <button
          aria-label={props.bookmarked ? "Remove bookmark" : "Bookmark"}
          onClick={() => props.onToggleBookmark(a.id)}
          className={`mono text-xs px-1 leading-5 ${
            props.bookmarked ? "siren" : "text-[var(--color-muted)]"
          }`}
          title="Bookmark"
        >
          {props.bookmarked ? "\u2605" : "\u2606"}
        </button>
        <button
          aria-label={props.queued ? "Remove from queue" : "Add to read-later queue"}
          onClick={() => props.onToggleQueue(a.id)}
          className={`mono text-xs px-1 leading-5 ${
            props.queued ? "text-[var(--color-link)]" : "text-[var(--color-muted)]"
          }`}
          title="Read later"
        >
          {"\u23F7"}
        </button>
        <div className="flex-1">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={priorityClass}
          >
            {a.title}
          </a>
          {relatedCount > 0 && (
            <span className="related-badge" title={`${relatedCount} more outlet${relatedCount === 1 ? "" : "s"} covering this`}>
              +{relatedCount}
            </span>
          )}
          <div className="mt-0.5 flex items-center gap-2 text-[11px] mono text-[var(--color-muted)]">
            <span className="source-badge">{a.source}</span>
            <span>{timeAgo(a.publishedAt)}</span>
            <button
              className="opacity-0 group-hover:opacity-100 underline-offset-2 hover:underline hover:siren"
              onMouseEnter={() => setMutedHint(true)}
              onClick={() => {
                props.onMuteSource(a.source);
                setMutedHint(false);
              }}
              title={`Mute ${a.source}`}
            >
              mute
            </button>
            {mutedHint && <span className="text-[10px]">click to hide</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
