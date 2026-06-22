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

### Implemented — Freshness, importance, and source-quality upgrade (2026-06-22)

Built the full plan in [`UPGRADE-PLAN.md`](./UPGRADE-PLAN.md).

**Freshness (Phase 1):**
- Recency half-life shortened 72h → 48h.
- Per-category age windows replace the single 14-day cap (fast lanes 5d hard / 2d soft; standard 10d/4d; slow 14d/7d).
- Starvation-aware visible fill: only backfills stale items when a section would drop below `MIN_VISIBLE = 4`.
- Trending freshness gate (≤72h) and lead-story freshness gate (≤96h).

**Importance (Phase 2):**
- Shared `scripts/lib/score.ts` — single source of truth (eliminates the duplicate scorer in router/groupStories).
- Keyword importance boosts: actively-exploited, zero-day, CVSS 9–10, ransomware, mass-record breaches, etc. (recency-gated, capped at 2.5).
- CISA KEV integration (`scripts/fetch-kev.ts`): articles referencing a KEV CVE are flagged `kev`, boosted, and may have display priority elevated to critical/high.

**Sources (Phase 3):**
- Pruned 7 dead/empty feeds (PortSwigger Daily Swig discontinued, Mandiant, Trend Micro, HackerOne, SC Media, trickest, r/AskNetsec).
- Repointed Google Project Zero to verified working feed.
- Added 16 live-validated feeds (SANS ISC, Risky Business, Securityaffairs, Securelist, Malwarebytes, watchTowr, ZDI blog + advisories, Google Online Security, JFrog, AWS Security, Sysdig, Cloudflare, HIBP, ProjectDiscovery blog, The DFIR Report).
- Fixed SECURITY TOOLS: `github-release` feed type synthesizes meaningful titles so the noise filter doesn't strip them.
- Parser hardening: rejects HTML bodies before XML parsing (root cause of "Maximum nested tags exceeded" and silent EMPTY results).

**UI (Phase 4):**
- NEW badge (<6h), KEV badge (CISA actively exploited), opacity de-emphasis (>72h).
- Masthead shows "updated Xm ago"; Lead Story shows full UTC timestamp.
- KEV badges on Trending and Lead Story.

**Guardrails (Phase 5):**
- `scripts/check-data.ts` + `npm run build:check` — feed health, per-category freshness/diversity, entity-leak scan, per-source cap. Warn by default, `--strict` to fail.
- CI: `npm run typecheck` and `npm run build:check` added to `.github/workflows/refresh.yml`.

**Validation (live, 2026-06-22):** All CI steps passed on first push (Typecheck, Build data w/ KEV, Data health check, Build site, Deploy).

Measured before → after (live `headlines.json`):

| Metric | Before | After |
|--------|--------|-------|
| Feed health | 46/51 (90%) | 58/59 (98%) |
| Visible articles 7d+ old | 27% (32) | **2% (2)** |
| Lead story age | 17.4h | **0.0h** (fresh CISA KEV story) |
| `data_breaches` sources | thin | 4 |
| `cloud_security` sources | thin | 4 |
| `security_tools` items | 0 (dead feeds) | 4 items / 3 sources |

`tsc --noEmit` green; production bundle 67.5 KB gzipped (flat vs. baseline). Network-bound `build:data` runs on the GitHub Actions runner (live feed fetches are blocked in some local dev sandboxes).

---

- Added [UPGRADE-PLAN.md](./UPGRADE-PLAN.md): a build-ready implementation plan for the next cycle — per-category freshness windows, shorter recency half-life, starvation-aware fill, importance/CISA-KEV scoring, and a source-quality overhaul (prune 7 dead feeds, add 16 live-validated sources, fix the SECURITY TOOLS feeds). Intended for a follow-up build agent.

See [FUTURE-IMPROVEMENTS.md](./FUTURE-IMPROVEMENTS.md) for the broader backlog.
