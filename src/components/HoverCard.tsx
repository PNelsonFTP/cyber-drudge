import { useEffect, useRef, useState } from "react";
import type { Article, GroupedArticle } from "../lib/types";
import { timeAgo, fullStamp } from "../lib/timeAgo";

/**
 * src/components/HoverCard.tsx
 * ----------------------------
 * Fixed-position preview card. The parent owns the hovered article; we just
 * render it. A 200ms hide delay is implemented by the caller via
 * `onRequestHide` — here we only display and position.
 */
export function HoverCard(props: {
  article: Article | GroupedArticle | null;
  anchorRect: DOMRect | null;
  onRequestHide: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (props.article) setVisible(true);
  }, [props.article]);

  if (!props.article || !props.anchorRect) return null;
  if (!visible) return null;

  const a = props.article;
  const top = Math.min(
    props.anchorRect.bottom + 6,
    window.innerHeight - 220
  );
  const left = Math.min(
    Math.max(8, props.anchorRect.left),
    window.innerWidth - 380
  );
  const related = "related" in a ? a.related : [];

  return (
    <div
      className="hover-card p-3"
      style={{ top, left }}
      onMouseEnter={() => {
        if (hideTimer.current) {
          window.clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }
      }}
      onMouseLeave={() => {
        hideTimer.current = window.setTimeout(() => {
          setVisible(false);
          props.onRequestHide();
        }, 200);
      }}
    >
      <div className="text-[11px] mono text-[var(--color-muted)] flex items-center gap-2">
        <span className="source-badge siren">{a.source}</span>
        <span>·</span>
        <span>{timeAgo(a.publishedAt)}</span>
        <span>·</span>
        <span title={fullStamp(a.publishedAt)}>UTC</span>
      </div>
      <div className="mt-1 font-semibold leading-snug">{a.title}</div>
      {a.snippet && (
        <div className="mt-1 text-[12px] text-[var(--color-muted)] line-clamp-3">
          {a.snippet}
        </div>
      )}
      {related.length > 0 && (
        <div className="mt-2 text-[11px] mono text-[var(--color-muted)]">
          <span className="underline">Also covered by:</span>{" "}
          {related.slice(0, 4).map((r) => r.source).join(", ")}
        </div>
      )}
      <div className="mt-2">
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-[12px] mono text-[var(--color-link)]"
        >
          Read article &rarr;
        </a>
      </div>
    </div>
  );
}
