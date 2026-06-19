# Changelog

All notable changes to Cyber Drudge. Data-only hourly commits (`chore(data): hourly refresh`) are omitted.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
Project versioning is informal (1.0.0 = initial production release).

---

## [1.0.0] — 2026-06-18

### Added — Initial build (`1bfff44`)

- Complete cybersecurity Drudge-style aggregator from `cyber-drudge-prompt.md`
- **18 categories**, **~50 RSS feeds**, keyword multi-routing, keyword-agnostic Reddit sources
- Build-time pipeline: `fetch-feeds`, `scrape-sources`, `router`, `groupStories`, `fetch-stocks`, `generate-brief`
- Static JSON output: `headlines.json`, `stocks.json`, `brief.json`
- React 19 + Vite 6 + Tailwind v4 client SPA
- Three views: Home, Bookmarks, Queue
- Features: search, hover card, source/category mutes, dark/light/system theme, sessionStorage SWR
- GitHub Actions hourly refresh + GitHub Pages deploy
- Global per-source cap (6), per-category diversity caps, Jaccard grouping, trending (2+ outlets)

### Changed — FT Portfolios theme (`8b976d6`)

- Section headers: larger, uppercase, more visual weight
- Color scheme: FT blue/orange with cream light background and navy dark mode
- CSS design tokens in `src/styles.css`

### Changed — Column layout balance (`624194f`)

- Moved **DATA BREACHES** and **PHISHING & FRAUD** from left column to center column
- Center column: 8 sections; left: 4; right: 6

### Changed — AI-Drudge design language (`b783bf1`)

Ten visual/interaction alignments with [AI-Drudge](https://pnelsonftp.github.io/ai-drudge/) while keeping FT palette:

1. Red-underline section headings
2. Source name pills on headlines
3. Related-story badges (+N related)
4. Monospace masthead typography
5. Black stock ticker bar
6. Cream page background (light mode)
7. Compact link density and Drudge-style hierarchy
8. Trending section styling alignment
9. Lead story prominence
10. Overall spacing and column rhythm

### Fixed — Dark mode hover card (`9b70f61`)

- Hover preview card was invisible in dark theme
- Added explicit `background: var(--color-surface-2)` to `.hover-card`

### Changed — Time-decay ranking (`572eddd`)

- Composite score: `priorityRank × recencyMultiplier` (72-hour half-life)
- Hard drop for articles older than 14 days
- Future-dated feed timestamps clamped to `now` (CISA edge case)
- Lead story comparator fixed (fresh exploits beat stale Patch Tuesday posts)
- Same decay applied in `groupStories.ts` for cluster representatives

### Fixed — Stock price changes (`572eddd`)

- Removed Stooq CSV fetch (404 HTML responses → all `change: 0`)
- Yahoo Finance only; uses `chartPreviousClose` for percent change
- Serial fetch with 250ms delay between tickers

### Added — Documentation (2026-06-18)

- `docs/README.md` — documentation index
- `docs/ARCHITECTURE.md` — system design
- `docs/SBOM.md` — software bill of materials
- `docs/HANDOFF.md` — operations handoff
- `docs/FUTURE-IMPROVEMENTS.md` — next-cycle backlog
- `docs/CHANGELOG.md` — this file

---

## Pre-release / infrastructure notes

| Topic | Detail |
| ----- | ------ |
| **Repository** | https://github.com/PNelsonFTP/cyber-drudge |
| **Live URL** | https://pnelsonftp.github.io/cyber-drudge/ |
| **Pages source** | GitHub Actions (not branch `/docs`) |
| **Cron** | `5 * * * *` (hourly at :05) |
| **Optional secret** | `ANTHROPIC_API_KEY` for LLM daily brief |

---

## Known issues at v1.0.0

| Issue | Workaround |
| ----- | ---------- |
| `ai_security`, `security_tools` sometimes single-source | Add feeds in `sources.ts` (see FUTURE-IMPROVEMENTS #1) |
| Trending section often 1–2 items | Tune Jaccard or CVE normalization (backlog #6–7) |
| Node 20 deprecation warning in Actions | Upgrade to Node 24 (backlog #3) |
| Cron JSON commits can conflict with local push | `git pull --rebase` (see HANDOFF.md) |

---

## [Unreleased]

See [FUTURE-IMPROVEMENTS.md](./FUTURE-IMPROVEMENTS.md) for planned work.
