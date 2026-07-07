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

## [1.1.0] — 2026-06-22

Major upgrade: freshness, importance scoring, source quality, and guardrails. See [UPGRADE-PLAN.md](./UPGRADE-PLAN.md) for the original plan.

### Added
- `scripts/lib/score.ts` — shared ranking (priority + importance × recency)
- `scripts/fetch-kev.ts` — CISA Known Exploited Vulnerabilities catalog
- `scripts/check-data.ts` — `npm run build:check` health gate
- 15 new RSS feeds; `github-release` feed type for SECURITY TOOLS
- NEW / KEV UI badges; masthead "updated Xm ago"
- [MIGRATION.md](./MIGRATION.md) — portability and rename guide

### Changed
- Recency half-life 72h → 48h
- Per-category `softAgeHours` / `maxAgeHours` replace global 14-day cap
- Starvation-aware visible fill (`MIN_VISIBLE = 4`)
- Trending gate ≤72h; lead preference ≤96h
- CI: typecheck + build:check steps

### Removed
- 7 dead feeds (Daily Swig, Mandiant, Trend Micro, HackerOne, SC Media, trickest, r/AskNetsec)

### Metrics (live)
- Feed health: 90% → 98%
- Visible articles 7d+ old: 27% → 2%
- Lead story: 17.4h stale → fresh CISA KEV story

---

## [1.2.0] — 2026-07-07

Full-project overhaul: every source link validated live, 53 audit findings verified and fixed, 35 new curated sources added (all feed URLs fetch-verified), CI hardened, docs refreshed.

### Fixed — ranking & routing (most impactful first)
- **KEV detection was completely dead** — `router.ts` built the CVE regex by uppercasing its source, turning `\b`→`\B` and `\d`→`\D` so no CVE ever matched. 0 of 279 live articles carried KEV flags despite a 1,631-CVE catalog. First rebuild after the fix: 8 KEV-flagged articles.
- **Google Project Zero / Google Online Security extracted 0 articles** — two parser bugs: `str()` never read fast-xml-parser's default `#text` node (Atom `<title type="html">`), and `pickLink()` took the *first* href in Blogger's link arrays (the `rel="replies"` comments feed). Fixed both; P0 also re-pointed to its new home `projectzero.google/feed.xml`.
- **Keyword router matched raw substrings** — "apt" hit laptop/capture/adaptive; "crypto" pulled cryptocurrency crime into CRYPTO & PQC; "research" routed almost everything into BUG BOUNTY. Keywords now compile to word-boundary regexes with an explicit `*` suffix for prefix matching; the unmatchable `"b ec "` rule became `"bec"`.
- **Scraped articles were re-stamped `Date.now()` every hourly run** — permanent freshness inflation for CrowdStrike items. First-seen timestamps now persist across runs via the previous `headlines.json`.
- **Stock daily change was wrong twice over** — `chartPreviousClose` with `range=5d` is the close ~6 sessions ago, and the fallback read the *current* bar. Reference is now the second-to-last non-null daily bar.
- **RFC822 dates with numeric zones ("+0000") truncated to midnight UTC** — the day-first branch intercepted them; the RFC822 pattern now accepts numeric offsets.
- **Lead story selection was order-dependent** — a stale high-scorer seeded early could beat fresh candidates. Fresh and stale candidates now tracked separately; fresh always wins.
- Stale backfill now tops thin sections up to `MIN_VISIBLE` (4) only, instead of filling to 12 with out-of-window leftovers.
- Per-feed item cap applies after noise filtering, so filtered items no longer under-fill feeds.
- `check-data` entity-leak regex now catches mid-string leaks.

### Fixed — pipeline robustness
- Per-feed 8s timeout now covers the **body read**, not just headers (a slow-streaming server could previously hang the hourly build indefinitely — reproduced locally).
- Zero-width regex matches in the scraper can no longer infinite-loop; relative hrefs resolve against the listing URL (not origin) and non-http(s) results are dropped.
- Retry now backs off 1s before the second attempt.
- Feed-controlled URLs are rejected at ingest unless `http(s)` (XSS hardening), with a matching render-time guard in `Headline.tsx`.

### Fixed — UI
- **Theme flash**: persisted theme now applies pre-hydration via an inline script in `index.html`.
- **Hover card**: dismisses when the pointer leaves the headline (previously stuck open unless the pointer entered the card), dismisses on tap-outside for touch devices, and clamps within narrow viewports.
- Header bookmark/queue counts now reflect resolvable articles, not orphaned IDs.
- Data revalidates when the tab regains visibility and every 15 minutes (long-lived tabs no longer freeze at "updated Xm ago").
- Accessibility: manage-mutes modal gained dialog semantics + Escape + initial focus; mobile accordion carets expose `aria-expanded`/`aria-controls`; mute buttons are visible on keyboard focus.

### Added — sources (net +35, all URLs fetch-verified before inclusion)
- **Repaired/replaced:** Project Zero → projectzero.google; r/netsec → **Lobsters Security**; r/cybersecurity → **HN Security 30+** (hnrss.org filtered; reddit.com 403/429s GitHub Actions IPs).
- **Incident response / DFIR:** The DFIR Report, This Week in 4n6, Sygnia, Volexity, Google Threat Intelligence (Mandiant).
- **AI security:** Embrace The Red, Simon Willison (security tag), NVIDIA AI Security.
- **ICS/OT:** CISA ICS Advisories, Industrial Cyber (via per-feed header support), Dale Peterson.
- **Identity:** SpecterOps, Permiso, dirkjanm.io, Entra.News.
- **Breach/fraud:** DataBreaches.net, TechCrunch Security, InfoStealers, Proofpoint Threat Insight, Cofense, FBI IC3 PSAs.
- **Vuln/offense:** CERT/CC Vulnerability Notes, CISA KEV Additions (RSS bridge), Horizon3.ai, Searchlight Cyber (Assetnote), TrustedSec.
- **Cloud/TI:** Datadog Security Labs, Group-IB.
- **Policy/market:** SEC Press Releases, NIST Cybersecurity Insights, Return on Security, Help Net Security, tl;dr sec.
- Notable rejections (documented in the research sweep): Kaspersky ICS CERT and PT SWARM on provenance grounds for a US-regulated firm; ~55 others for marketing mix, redundancy, or dead feeds.

### Added — tooling & CI
- `scripts/validate-sources.ts` + `npm run validate:sources` — live-checks every feed, scrape target, KEV endpoint, and stock ticker (HTTP, XML validity, item count, newest-item age; `--strict` exits 1).
- Per-feed `headers` option in `FeedDef`.
- Dependabot (npm weekly grouped + GitHub Actions).
- CI: Node 20 → **24**, `timeout-minutes: 15`, actions pinned to commit SHAs, `github-pages` environment declared, `git pull --rebase` before the data commit push.
- `index.html` uses `%BASE_URL%` — renaming the repo now touches `vite.config.ts` only; removed the preload hints that double-downloaded all three JSON files.

### Changed
- `fast-xml-parser` 4.5.6 → **5.9.3** (clears GHSA-gh4j-gqv2-49f6; `npm audit` now 0 vulnerabilities).
- `incident_response` moved from the fast lane to the standard lane (96h/240h) — DFIR write-ups publish days after the intrusion.
- CISA Advisories re-homed from POLICY & REGULATION to VULNERABILITIES; "cisa" keyword rule dropped.
- NETWORK & ENDPOINT keywords now include appliance/vendor terms (firewall, vpn, Fortinet, Ivanti, Citrix, Palo Alto, F5, NetScaler).
- Stock tickers: removed SNET (never existed) and CYBR (delisted post-acquisition); added TENB, NET.
- Brief generator model: `claude-3-5-haiku-latest` → `claude-haiku-4-5-20251001`.

### Metrics (first rebuild after upgrade)
- Sources: 59 → **92** (91 feeds + 1 scrape); fetch success 91/92 (99%) — the one failure is a local-IP 403 that passes in CI.
- Articles per run: ~600 → **908**; all 18 categories populated (was: 5 categories starved with ≤1 source).
- KEV-flagged articles: 0 → 8; `npm audit`: 1 moderate → 0.
- Bundle: ~73 KB gzipped (JS+CSS), within the ~72 KB quality bar.

---

## [Unreleased]

See [FUTURE-IMPROVEMENTS.md](./FUTURE-IMPROVEMENTS.md) for the next cycle backlog.
