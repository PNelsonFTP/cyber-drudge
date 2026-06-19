# Future Improvements — Next Upgrade Cycle

**Project:** Cyber Drudge  
**Document version:** 1.0  
**Target cycle:** Post–v1.0 maintenance / v1.1 feature pass  
**Last reviewed:** 2026-06-18

This backlog is prioritized for the next dedicated improvement sprint. Items are grouped by theme; effort is **S** (small), **M** (medium), **L** (large).

---

## P0 — Fix known gaps

| # | Item | Effort | Rationale |
| - | ---- | ------ | --------- |
| 1 | **Single-source sections** — `ai_security`, `security_tools` often have only one outlet | M | Add 2–3 niche feeds per category, or hide sections below diversity threshold |
| 2 | **SNET ticker validation** — listed in `STOCK_TICKERS` but may not resolve on Yahoo | S | Confirm symbol (SentinelOne is `S`; `SNET` may be wrong ticker). Fix or swap |
| 3 | **Node 24 in CI** — GitHub deprecating Node 20 on Actions runners | S | Bump `node-version` in `refresh.yml`, verify `npm ci` + build |
| 4 | **LLM brief verification** — confirm `ANTHROPIC_API_KEY` + model ID in `generate-brief.ts` | S | Document expected model; add log line when LLM vs fallback used |

---

## P1 — Data quality and ranking

| # | Item | Effort | Rationale |
| - | ---- | ------ | --------- |
| 5 | **Extract shared scoring** — DRY `scoreArticle()` used by `router.ts` and `groupStories.ts` | S | Prevents ranking drift between visible sort and cluster picks |
| 6 | **CVE-aware grouping** — normalize `CVE-2024-12345` in titles before Jaccard | M | More trending clusters on vulnerability stories |
| 7 | **Tune Jaccard threshold** — currently 0.4; trending often has only 1–2 clusters | M | A/B at 0.35 vs 0.45; measure cluster count and false merges |
| 8 | **Per-category age caps** — e.g. `breaking_threats` 72h, `policy_regulation` 21d | M | Operational vs policy content has different freshness curves |
| 9 | **Feed health alert** — fail workflow or open issue when `ok/total < 80%` | M | Early warning before silent degradation |
| 10 | **Duplicate URL dedup across sources** — same AP story via two aggregators | S | Reduce redundant related badges |

---

## P2 — Parity with AI-Drudge

Reference: https://pnelsonftp.github.io/ai-drudge/

| # | Item | Effort | Rationale |
| - | ---- | ------ | --------- |
| 11 | **Section collapse carets** (`▼` / `▶`) on mobile or all viewports | S | AI-Drudge accordion pattern |
| 12 | **Priority visual classes** — `critical` / `high` styling on headline links | S | Operational urgency at a glance |
| 13 | **“Last updated” relative time** in masthead from `generatedAt` | S | User trust in freshness |
| 14 | **Keyboard navigation** — j/k or arrow through headlines | M | Power-user parity |
| 15 | **Print stylesheet** — clean single-column for briefings | S | Common Drudge use case |

---

## P3 — CI/CD and quality gates

| # | Item | Effort | Rationale |
| - | ---- | ------ | --------- |
| 16 | **CI typecheck job** — `npx tsc --noEmit` on every PR | S | Catch script/type regressions before merge |
| 17 | **Data quality script** — entity leak scan, per-source cap assert, min categories | M | Encode manual QA from build cycle |
| 18 | **Dependabot** — npm + GitHub Actions | S | Supply-chain hygiene (see SBOM) |
| 19 | **Separate data vs deploy workflows** — data commit job independent of Vite build | L | Reduce race when cron and code push collide |
| 20 | **Skip `[skip ci]` loop clarity** — data commits skip CI but push still triggers deploy | S | Document or split triggers to avoid double runs |

---

## P4 — UX and accessibility

| # | Item | Effort | Rationale |
| - | ---- | ------ | --------- |
| 21 | **Mobile layout audit** — 3-column → stacked breakpoints, touch targets | M | Real-device testing not done in v1.0 |
| 22 | **Reduced motion** — respect `prefers-reduced-motion` on hover card | S | a11y |
| 23 | **Focus visible styles** — keyboard focus rings on links and nav | S | WCAG |
| 24 | **Screen reader labels** — section landmarks, related-count announcements | M | a11y |
| 25 | **Offline/PWA** — service worker cache for JSON + shell | L | Read headlines without network after first visit |

---

## P5 — Features (new scope)

| # | Item | Effort | Rationale |
| - | ---- | ------ | --------- |
| 26 | **CVE watchlist** — user-pinned CVE IDs highlighted in feed | L | Practitioner workflow |
| 27 | **Export bookmarks** — JSON/OPML download | S | Portability |
| 28 | **RSS output feed** — meta: Cyber Drudge’s top N as RSS | M | Syndication (build-time generation only) |
| 29 | **Historical archive** — S3 or gh-pages branch for daily JSON snapshots | L | Trend analysis over time |
| 30 | **Multi-tenant fork template** — parameterize `base`, title, colors via env | M | Reuse for other verticals |

---

## P6 — Observability and ops

| # | Item | Effort | Rationale |
| - | ---- | ------ | --------- |
| 31 | **Feed health dashboard** — static page from `feedStats` history | M | Visual ops without log diving |
| 32 | **Structured build logs** — JSON summary artifact per run (counts, failures) | M | Parseable monitoring |
| 33 | **Slack/email webhook** on workflow failure | S | Alerting |
| 34 | **Rate-limit backoff** — exponential retry for Yahoo and flaky feeds | M | Resilience |

---

## Suggested sprint plan (2-week cycle)

### Week 1 — Stability
- Items 1–4 (P0)
- Items 5, 9, 16 (scoring DRY, feed alert, typecheck)
- Item 3 (Node 24)

### Week 2 — Polish
- Items 11–13 (AI-Drudge parity quick wins)
- Item 21 (mobile audit)
- Items 6–7 if time (CVE grouping + Jaccard tune)

---

## Explicit non-goals (unless product direction changes)

| Non-goal | Reason |
| -------- | ------ |
| Live RSS in the browser | Core architecture rule |
| Backend / database | Static-first design |
| User accounts / sync | Complexity vs GitHub Pages hosting |
| Comments or social | Out of scope for Drudge clone |
| Paywalled content scraping | Legal and maintenance risk |

---

## How to use this document

1. Pick a sprint theme (stability, parity, features).
2. Create GitHub issues from row numbers (#1–#34).
3. Update [CHANGELOG.md](./CHANGELOG.md) when items ship.
4. Re-prioritize after each cycle based on `feedStats` and user feedback.
