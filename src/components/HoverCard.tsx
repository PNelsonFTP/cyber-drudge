import { useEffect, useRef } from "react";
import type { Article, GroupedArticle } from "../lib/types";
import { timeAgo, fullStamp } from "../lib/timeAgo";

/**
 * src/components/HoverCard.tsx
 * ----------------------------
 * Fixed-position preview card. Purely presentational: the parent (App) owns
 * the hovered article AND the show/hide delay timer. Entering the card
 * cancels the pending hide; leaving it re-schedules; tapping/clicking
 * anywhere outside dismisses immediately (touch devices have no mouseleave).
 */
export function HoverCard(props: {
  article: Article | GroupedArticle | null;
  anchorRect: DOMRect | null;
  onCancelHide: () => void;
  onScheduleHide: () => void;
  onRequestHide: () => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { article, onRequestHide } = props;

  useEffect(() => {
    if (!article) return;
    const onPointerDown = (e: PointerEvent) => {
      if (cardRef.current && e.target instanceof Node && cardRef.current.contains(e.target)) return;
      onRequestHide();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [article, onRequestHide]);

  if (!props.article || !props.anchorRect) return null;

  const a = props.article;
  const top = Math.max(8, Math.min(props.anchorRect.bottom + 6, window.innerHeight - 220));
  // Clamp within the viewport; Math.max last so narrow (mobile) widths pin
  // to the left edge instead of going negative.
  const left = Math.max(8, Math.min(props.anchorRect.left, window.innerWidth - 368));
  const related = "related" in a ? a.related : [];

  return (
    <div
      ref={cardRef}
      className="hover-card p-3"
      style={{ top, left, maxWidth: "min(360px, calc(100vw - 16px))" }}
      onMouseEnter={props.onCancelHide}
      onMouseLeave={props.onScheduleHide}
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
