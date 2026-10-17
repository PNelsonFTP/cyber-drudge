import type { ThemeChoice } from "../hooks/useTheme";
import { timeAgo } from "../lib/timeAgo";

/**
 * src/components/Header.tsx
 * ------------------------
 * First Trust masthead shared with XPND DRUDGE and AI DRUDGE: navy bar,
 * gold rule, gold wordmark, and a silver search row.
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
  const stale = props.generatedAt != null && Date.now() - props.generatedAt > 6 * 3_600_000;
  return (
    <header>
      <div className="header-row">
        <button type="button" className="masthead-btn" onClick={() => props.setView("home")} title="Home">
          <span className="logo">
            <span className="mark">CYBER</span> DRUDGE
          </span>
          <span className="tagline">
            cybersecurity
            {props.generatedAt ? ` · updated ${timeAgo(props.generatedAt)}` : " · loading"}
            {` · feeds ${props.feedsOk.ok}/${props.feedsOk.total}`}
          </span>
        </button>
        <div className="toolbar">
          <button
            type="button"
            className={`tool-btn ${props.view === "bookmarks" ? "active" : ""}`}
            onClick={() => props.setView(props.view === "bookmarks" ? "home" : "bookmarks")}
            title="Bookmarks"
          >
            ★ Bookmarks {props.bookmarksCount}
          </button>
          <button
            type="button"
            className={`tool-btn ${props.view === "queue" ? "active" : ""}`}
            onClick={() => props.setView(props.view === "queue" ? "home" : "queue")}
            title="Read later"
          >
            ⏷ Later {props.queueCount}
          </button>
          <button type="button" className="tool-btn" onClick={props.onOpenMutes} title="Manage hidden sources">
            Mutes {props.mutedCount}
          </button>
          <button
            type="button"
            className={`tool-btn ${stale ? "stale" : ""}`}
            onClick={props.onCycleTheme}
            title={`Theme: ${props.theme}`}
          >
            {props.theme === "dark" ? "Dark" : props.theme === "light" ? "Light" : "Auto"}
          </button>
        </div>
      </div>
      <div className="control-row">
        <input
          type="search"
          className="search-input"
          placeholder="search headlines, sources, categories…"
          value={props.search}
          onChange={(e) => props.onSearch(e.target.value)}
          aria-label="Search headlines"
        />
      </div>
    </header>
  );
}
