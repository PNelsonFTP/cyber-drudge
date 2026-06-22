import type { ThemeChoice } from "../hooks/useTheme";
import { timeAgo } from "../lib/timeAgo";

/**
 * src/components/Header.tsx
 * ------------------------
 * Top toolbar. Masthead "CYBER DRUDGE" in red. Four toolbar buttons on the
 * right: bookmarks count, queue count, muted count, theme toggle. Search
 * input below the masthead (client-side filter).
 */
export type View = "home" | "bookmarks" | "queue";

export function Header(props: {
  view: View;
  setView: (v: View) => void;
  bookmarksCount: number;
  queueCount: number;
  mutedCount: number;
  theme: ThemeChoice;
  onCycleTheme: () => void;
  onOpenMutes: () => void;
  search: string;
  onSearch: (q: string) => void;
  generatedAt: number | null;
  feedsOk: { ok: number; total: number };
}) {
  return (
    <header className="border-b-2 border-[var(--color-siren)]">
      <div className="flex items-end justify-between px-3 pt-3 pb-1">
        <button
          className="text-left masthead"
          onClick={() => props.setView("home")}
          title="Home"
        >
          <div className="siren text-3xl md:text-4xl">
            CYBER<span className="text-[var(--color-fg)]"> DRUDGE</span>
          </div>
          <div className="text-[10px] mono uppercase text-[var(--color-muted)] tracking-widest mt-0.5">
            cybersecurity, drudge-style ·{" "}
            {props.generatedAt
              ? `updated ${timeAgo(props.generatedAt)}`
              : "loading"}
          </div>
        </button>
        <div className="flex items-center gap-2 pb-1">
          <ToolBtn
            label="bookmarks"
            glyph={"\u2605"}
            count={props.bookmarksCount}
            active={props.view === "bookmarks"}
            onClick={() => props.setView(props.view === "bookmarks" ? "home" : "bookmarks")}
          />
          <ToolBtn
            label="queue"
            glyph={"\u23F7"}
            count={props.queueCount}
            active={props.view === "queue"}
            onClick={() => props.setView(props.view === "queue" ? "home" : "queue")}
          />
          <ToolBtn
            label="muted"
            glyph={"\u2715"}
            count={props.mutedCount}
            onClick={props.onOpenMutes}
          />
          <button
            className="mono text-[12px] px-2 py-1 border border-[var(--color-line)] hover:siren"
            onClick={props.onCycleTheme}
            title={`Theme: ${props.theme}`}
          >
            {props.theme === "dark" ? "DARK" : props.theme === "light" ? "LIGHT" : "AUTO"}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 border-t border-[var(--color-line)]">
        <input
          className="flex-1 bg-[var(--color-surface)] border border-[var(--color-line)] px-2 py-1 text-[13px] mono outline-none focus:border-[var(--color-accent)]"
          placeholder="search headlines, sources, categories..."
          value={props.search}
          onChange={(e) => props.onSearch(e.target.value)}
        />
        <span className="text-[11px] mono text-[var(--color-muted)] whitespace-nowrap">
          feeds: {props.feedsOk.ok}/{props.feedsOk.total}
        </span>
      </div>
    </header>
  );
}

function ToolBtn(props: {
  label: string;
  glyph: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={props.label}
      onClick={props.onClick}
      className={`mono text-[12px] px-2 py-1 border ${
        props.active
          ? "border-[var(--color-accent)] siren"
          : "border-[var(--color-line)] text-[var(--color-muted)] hover:siren"
      }`}
    >
      {props.glyph}{" "}
      <span className="ml-1">{props.count}</span>
    </button>
  );
}
