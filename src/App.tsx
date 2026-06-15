import { useMemo, useState } from "react";
import { Header, type View } from "./components/Header";
import { StockTicker } from "./components/StockTicker";
import { DailyBrief } from "./components/DailyBrief";
import { Trending } from "./components/Trending";
import { LeadStory } from "./components/LeadStory";
import { CategoryColumn } from "./components/CategoryColumn";
import { HoverCard } from "./components/HoverCard";
import { ManageMutes } from "./components/ManageMutes";
import { useHeadlines } from "./hooks/useHeadlines";
import { useLocalStorageSet } from "./hooks/useLocalStorageSet";
import { useTheme } from "./hooks/useTheme";
import type { Article, CategoryBucket, GroupedArticle, HeadlinesPayload } from "./lib/types";
import { CATEGORIES, type CategoryDef } from "../scripts/sources";

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c: CategoryDef) => [c.id, c.label])
);

export default function App() {
  const { data, stocks, brief, generatedAt } = useHeadlines();
  const { resolved: _resolved, theme, cycle } = useTheme();
  void _resolved;

  const [view, setView] = useState<View>("home");
  const [search, setSearch] = useState("");
  const [openMutes, setOpenMutes] = useState(false);
  const [hoverArticle, setHoverArticle] = useState<Article | GroupedArticle | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const bookmarks = useLocalStorageSet("cyber-drudge:bookmarks");
  const queue = useLocalStorageSet("cyber-drudge:queue");
  const mutedSources = useLocalStorageSet("cyber-drudge:muted:sources");
  const mutedCats = useLocalStorageSet("cyber-drudge:muted:categories");

  const mutedSourcesSet = useMemo(() => new Set(mutedSources.items), [mutedSources.items]);
  const mutedCatsSet = useMemo(() => new Set(mutedCats.items), [mutedCats.items]);

  // Bookmarks view = full article objects for every bookmarked ID.
  const bookmarkedArticles = useMemo<GroupedArticle[]>(() => {
    if (!data) return [];
    const ids = new Set(bookmarks.items);
    const out: GroupedArticle[] = [];
    for (const cat of data.categories) {
      for (const a of cat.articlesAll) {
        if (ids.has(a.id)) out.push(a);
        for (const r of a.related) {
          if (ids.has(r.id)) out.push({ ...r, related: [] });
        }
      }
    }
    return dedupeById(out);
  }, [bookmarks.items, data]);

  const queuedArticles = useMemo<GroupedArticle[]>(() => {
    if (!data) return [];
    const ids = new Set(queue.items);
    const out: GroupedArticle[] = [];
    for (const cat of data.categories) {
      for (const a of cat.articlesAll) {
        if (ids.has(a.id)) out.push(a);
        for (const r of a.related) {
          if (ids.has(r.id)) out.push({ ...r, related: [] });
        }
      }
    }
    return dedupeById(out);
  }, [queue.items, data]);

  const onHover = (a: Article | GroupedArticle, rect: DOMRect) => {
    setHoverArticle(a);
    setHoverRect(rect);
  };
  const onHoverEnd = () => {
    // The HoverCard handles its own 200ms hide delay via onMouseLeave.
  };

  const mutedCount = mutedSources.size + mutedCats.size;
  const feedsOk = useMemo(() => {
    const stats = data?.feedStats ?? [];
    return { ok: stats.filter((s) => s.ok).length, total: stats.length };
  }, [data]);

  const filtered = useMemo(
    () => filterPayload(data, search, mutedSourcesSet, mutedCatsSet),
    [data, search, mutedSourcesSet, mutedCatsSet]
  );

  return (
    <div className="min-h-screen">
      <Header
        view={view}
        setView={setView}
        bookmarksCount={bookmarks.size}
        queueCount={queue.size}
        mutedCount={mutedCount}
        theme={theme}
        onCycleTheme={cycle}
        onOpenMutes={() => setOpenMutes(true)}
        search={search}
        onSearch={setSearch}
        generatedAt={generatedAt}
        feedsOk={feedsOk}
      />
      <StockTicker quotes={stocks} />

      <main className="max-w-[1400px] mx-auto px-2 md:px-4 py-2">
        {view === "home" && (
          <>
            <DailyBrief brief={brief} />
            <Trending stories={filtered?.trending ?? []} />
            {filtered && (
              <ThreeColumnLayout
                payload={filtered}
                mutedSourcesSet={mutedSourcesSet}
                mutedCatsSet={mutedCatsSet}
                isBookmarked={(id) => bookmarks.has(id)}
                isQueued={(id) => queue.has(id)}
                onToggleBookmark={bookmarks.toggle}
                onToggleQueue={queue.toggle}
                onMuteSource={mutedSources.add}
                onMuteCategory={mutedCats.add}
                onHover={onHover}
                onHoverEnd={onHoverEnd}
              />
            )}
            {!filtered && <LoadingOrEmpty data={data} />}
          </>
        )}

        {view === "bookmarks" && (
          <SingleColumnList
            title={`BOOKMARKS (${bookmarkedArticles.length})`}
            articles={bookmarkedArticles.filter(
              (a) => !mutedSourcesSet.has(a.source) && !mutedCatsSet.has(a.category)
            )}
            isBookmarked={(id) => bookmarks.has(id)}
            isQueued={(id) => queue.has(id)}
            onToggleBookmark={bookmarks.toggle}
            onToggleQueue={queue.toggle}
            onMuteSource={mutedSources.add}
            onHover={onHover}
            onHoverEnd={onHoverEnd}
          />
        )}

        {view === "queue" && (
          <SingleColumnList
            title={`READ LATER (${queuedArticles.length})`}
            articles={queuedArticles.filter(
              (a) => !mutedSourcesSet.has(a.source) && !mutedCatsSet.has(a.category)
            )}
            isBookmarked={(id) => bookmarks.has(id)}
            isQueued={(id) => queue.has(id)}
            onToggleBookmark={bookmarks.toggle}
            onToggleQueue={queue.toggle}
            onMuteSource={mutedSources.add}
            onHover={onHover}
            onHoverEnd={onHoverEnd}
          />
        )}
      </main>

      <Footer payload={data} feedsOk={feedsOk} />

      <HoverCard
        article={hoverArticle}
        anchorRect={hoverRect}
        onRequestHide={() => {
          setHoverArticle(null);
          setHoverRect(null);
        }}
      />

      <ManageMutes
        open={openMutes}
        mutedSources={mutedSources.items}
        mutedCategories={mutedCats.items}
        categoryLabels={CATEGORY_LABELS}
        onClose={() => setOpenMutes(false)}
        onRestoreSource={mutedSources.remove}
        onRestoreCategory={mutedCats.remove}
        onRestoreAll={() => {
          mutedSources.clear();
          mutedCats.clear();
        }}
      />
    </div>
  );
}

function ThreeColumnLayout(props: {
  payload: HeadlinesPayload;
  mutedSourcesSet: Set<string>;
  mutedCatsSet: Set<string>;
  isBookmarked: (id: string) => boolean;
  isQueued: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onToggleQueue: (id: string) => void;
  onMuteSource: (s: string) => void;
  onMuteCategory: (c: string) => void;
  onHover: (a: Article | GroupedArticle, rect: DOMRect) => void;
  onHoverEnd: () => void;
}) {
  const { payload } = props;
  const buckets = payload.categories.filter(
    (c) => c.articles.length > 0 && !props.mutedCatsSet.has(c.id)
  );
  const left = buckets.filter((b) => b.column === "left");
  const center = buckets.filter((b) => b.column === "center");
  const right = buckets.filter((b) => b.column === "right");

  const renderCol = (cols: CategoryBucket[], withLead = false) => (
    <div className="md:col-rule px-1 md:px-2">
      {withLead && <LeadStory lead={payload.leadStory} />}
      {cols.map((b) => (
        <CategoryColumn
          key={b.id}
          bucket={b}
          bookmarked={props.isBookmarked}
          queued={props.isQueued}
          onToggleBookmark={props.onToggleBookmark}
          onToggleQueue={props.onToggleQueue}
          onMuteSource={props.onMuteSource}
          onMuteCategory={props.onMuteCategory}
          onHover={props.onHover}
          onHoverEnd={props.onHoverEnd}
        />
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-0">
      {renderCol(left)}
      {renderCol(center, true)}
      {renderCol(right)}
    </div>
  );
}

function SingleColumnList(props: {
  title: string;
  articles: GroupedArticle[];
  isBookmarked: (id: string) => boolean;
  isQueued: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onToggleQueue: (id: string) => void;
  onMuteSource: (s: string) => void;
  onHover: (a: Article | GroupedArticle, rect: DOMRect) => void;
  onHoverEnd: () => void;
}) {
  return (
    <section className="max-w-2xl mx-auto py-2">
      <h2 className="font-bold uppercase mono text-[13px] tracking-wider mb-2">
        {props.title}
      </h2>
      {props.articles.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted)]">Nothing here yet.</p>
      ) : (
        props.articles.map((a) => (
          <CategoryColumn
            key={a.id}
            bucket={{
              id: a.category,
              label: CATEGORY_LABELS[a.category] ?? a.category,
              column: "left",
              articles: [{ ...a, related: [] }],
              articlesAll: [{ ...a, related: [] }],
              sourceCount: 1,
            }}
            bookmarked={props.isBookmarked}
            queued={props.isQueued}
            onToggleBookmark={props.onToggleBookmark}
            onToggleQueue={props.onToggleQueue}
            onMuteSource={props.onMuteSource}
            onMuteCategory={() => {}}
            onHover={props.onHover}
            onHoverEnd={props.onHoverEnd}
          />
        ))
      )}
    </section>
  );
}

function Footer(props: { payload: HeadlinesPayload | null; feedsOk: { ok: number; total: number } }) {
  return (
    <footer className="border-t border-[var(--color-line)] mt-4 py-3 px-3 text-[11px] mono text-[var(--color-muted)] flex justify-between">
      <span>
        feeds: {props.feedsOk.ok}/{props.feedsOk.total} OK ·{" "}
        {props.payload?.categories.length ?? 0} categories
      </span>
      <span>
        built at {props.payload ? new Date(props.payload.generatedAt).toISOString() : "-"}
      </span>
    </footer>
  );
}

function LoadingOrEmpty(props: { data: HeadlinesPayload | null }) {
  if (!props.data) {
    return (
      <div className="py-12 text-center text-[var(--color-muted)] mono">
        Loading headlines...
      </div>
    );
  }
  if (props.data.categories.length === 0) {
    return (
      <div className="py-12 text-center text-[var(--color-muted)] mono">
        No headlines available.
      </div>
    );
  }
  return null;
}

/** Apply search + mutes across the whole payload, returning a filtered copy. */
function filterPayload(
  payload: HeadlinesPayload | null,
  search: string,
  mutedSources: Set<string>,
  mutedCats: Set<string>
): HeadlinesPayload | null {
  if (!payload) return null;
  const q = search.trim().toLowerCase();
  const match = (a: Article) => {
    if (mutedSources.has(a.source)) return false;
    if (mutedCats.has(a.category)) return false;
    if (!q) return true;
    const hay = `${a.title} ${a.source} ${CATEGORY_LABELS[a.category] ?? ""} ${
      a.snippet ?? ""
    }`.toLowerCase();
    return hay.includes(q);
  };

  const categories = payload.categories
    .filter((c) => !mutedCats.has(c.id))
    .map((c) => ({
      ...c,
      articles: c.articles.filter((a) => match(a)),
      articlesAll: c.articlesAll
        .map((g) => ({ ...g, related: g.related.filter(match) }))
        .filter((g) => match(g)),
    }))
    .filter((c) => c.articles.length > 0);

  const trending = payload.trending.filter((t) => {
    if (mutedSources.has(t.primarySource)) return false;
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || t.sources.some((s) => s.toLowerCase().includes(q));
  });

  const leadStory =
    payload.leadStory && match(payload.leadStory) ? payload.leadStory : null;

  return { ...payload, categories, trending, leadStory };
}

function dedupeById(arr: GroupedArticle[]): GroupedArticle[] {
  const seen = new Set<string>();
  const out: GroupedArticle[] = [];
  for (const a of arr) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}
