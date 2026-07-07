# Future Improvements — Next Upgrade Cycle

**Project:** Cyber Drudge
**Document version:** 3.0 (post v1.2.0)
**Last reviewed:** 2026-07-07
**Baseline:** v1.2.0 shipped — 92 validated sources, KEV fix, word-boundary routing, CI hardening, validate:sources

This backlog is for the **next** dedicated improvement session. Items completed in v1.2 are listed at the bottom so they are not re-implemented.

---

## Next session — prioritized backlog (12 items)

| # | Item | Effort | Rationale / approach |
| - | ---- | ------ | -------------------- |
| 1 | **CVE-aware trending** — normalize CVE IDs before Jaccard so "CVE-2026-45659 exploited" clusters with "SharePoint deserialization bug under attack"; consider dropping the threshold 0.4 → 0.35 | M | Trending regularly shows only 1–2 clusters. Token-level: replace `CVE-\d{4}-\d+` with a canonical token and add vendor/product aliases before similarity. |
| 2 | **Add `category` to `TrendingStory`** and filter Trending by muted categories | S | Muting a category currently still shows its stories in Trending (`src/App.tsx` filter can't see category). One field in `router.ts` + one filter clause. |
| 3 | **Per-feed include/exclude keyword filters** in `FeedDef` | M | SEC Press Releases and NVIDIA are capped low because they mix non-cyber items; an `includeMatch` filter would let them run at full volume with signal intact. |
| 4 | **Feed-health history + dashboard** — append each run's `feedStats` to a rolling JSONL, render a static `/health` page | M | One run's snapshot can't distinguish a flaky feed from a dead one. The cron already commits data hourly; append-and-trim keeps the file bounded. |
| 5 | **Strict CI data gate** — run `build:check -- --strict` after a 2-week soak of the 35 new feeds; alert on failure via Actions → email/Slack webhook | S | Health check currently gates nothing. Soak first: some new sources (beehiiv-hosted, Sentry-walled Industrial Cyber, hobby KEV bridge) may need pruning before strict mode is safe. |
| 6 | **Split tsconfig** — `src/` (DOM, no Node types) vs `scripts/` (Node, no DOM) project references | M | One config currently gives browser code Node globals and scripts DOM globals; a wrong-environment API use would typecheck today. Also de-duplicates the double typecheck in CI. |
| 7 | **Score double-count review** — `elevatePriority` raises `priority` *and* `importanceBoost` adds for the same signals | M | Deliberate editorial bias toward exploited vulns, but untuned. Separate `displayPriority` from scoring priority, A/B the resulting front pages, then decide. |
| 8 | **Keyboard navigation** — j/k through headlines, o to open, b/q to bookmark/queue | M | Power-user parity with the AI-Drudge backlog; headlines are already discrete DOM rows. |
| 9 | **Print stylesheet** — clean single-column for morning-briefing printouts | S | Common Drudge-style use case; pure CSS `@media print`. |
| 10 | **RSS output feed** — emit `public/feed.xml` (top ~25 by score) at build time | M | Lets Cyber Drudge itself be consumed by Slack/Teams/feed readers — including First Trust internal channels. |
| 11 | **Daily JSON snapshot archive** — commit `public/data/archive/YYYY-MM-DD.json` (headlines only, 90-day retention) | L | Enables week-over-week trend analysis and a "this day last month" rail; watch repo size (≈280 KB/day). |
| 12 | **Vite 8 / TypeScript 6 / plugin-react 6 upgrade pass** — coordinated major-version bump once `@tailwindcss/vite` declares Vite 8 support | M | Deferred from v1.2 deliberately: build tooling majors bundled together with full build + preview verification. |

### Stretch (13–16)

| # | Item | Effort | Rationale |
| - | ---- | ------ | --------- |
| 13 | CVE watchlist — user-pinned CVE IDs highlighted anywhere they appear | L | Practitioner workflow; localStorage + regex match at render. |
| 14 | LLM brief in production — add `ANTHROPIC_API_KEY` repo secret (brief currently always "curated"); log llm/curated + model ID in CI | S | The Haiku 4.5 call path is fixed and ready; the key has simply never been configured in Actions. |
| 15 | Multi-tenant template — parameterize title/palette/base via a single config for future verticals (fin-reg drudge, AI drudge shares code) | M | Two sibling sites already exist; a third would force the refactor anyway. |
| 16 | Synacktiv + HiddenLayer onboarding — Synacktiv needs empty-`pubDate` first-seen fallback (infra now exists from the scrape fix); HiddenLayer needs a scrape entry | S | Both were verified high-quality but blocked on pipeline features during the v1.2 research sweep. |

---

## Deferred decisions (call these consciously, don't let them rot)

| Decision | Context |
| -------- | ------- |
| **Industrial Cyber cookie** | Feed works only with `Cookie: SentryVerifiedJS=true` (the value their own JS sets). If they change the check, the feed fails soft. Revisit whether the dependency is worth it, or scrape instead. |
| **CISA KEV Additions bridge** | kevin.gtfkd.com is a third-party hobby service. `fetch-kev.ts` JSON remains the scoring source of truth; the bridge only surfaces headlines. If it dies, consider generating KEV headline items directly from the JSON in `build-data.ts` (removes the dependency entirely — arguably the better design). |
| **Outflank 403** | Blocks some IPs (fails locally, passes in CI at last check). If CI starts failing, drop it — offense_red_team now has 5 other sources. |
| **Google feeds are slow publishers** | P0 (~8 w) and Google Online Security (~11 w) parse correctly now but publish rarely; they will only appear when fresh. That is correct behavior, not a bug. |

---

## Completed in v1.2 (do not re-implement)

| Item | Status |
| ---- | ------ |
| KEV regex fix (detection was fully dead) | ✅ |
| Google feeds `#text` / `rel=alternate` parser fixes | ✅ |
| Word-boundary keyword routing (+ `*` prefix syntax) | ✅ |
| 35 new verified sources; Reddit → Lobsters + hnrss | ✅ |
| Thin categories fixed (all 18 populated, was 5 starved) | ✅ |
| validate:sources live link checker | ✅ |
| Scraped-article first-seen date persistence | ✅ |
| Stock previous-close correctness | ✅ |
| RFC822 numeric-zone date parsing | ✅ |
| Body-read timeout (hung-build fix) | ✅ |
| Node 24, SHA-pinned actions, Dependabot, rebase-before-push, timeout-minutes | ✅ |
| fast-xml-parser v5 (audit clean) | ✅ |
| Theme flash, hover dismissal, touch support, a11y pass | ✅ |
| SWR revalidation (visibility + 15 min) | ✅ |
| `%BASE_URL%` index.html (single-file rename) | ✅ |
| SNET/CYBR ticker cleanup; TENB + NET added | ✅ |
| Docs refresh (all counts/versions verified against code) | ✅ |

Completed v1.1 items are archived in [CHANGELOG.md](./CHANGELOG.md).

---

## Explicit non-goals

| Non-goal | Reason |
| -------- | ------ |
| Live RSS in the browser | Core architecture rule |
| Backend / database | Static-first design |
| User accounts / sync | Complexity vs Pages hosting |
| Full-archive ingestion of 300+ item feeds | Headline wall, not a data lake — `maxItems` caps stay |

---

## How to use this document

1. Pick items from the prioritized table (they are ordered by value-per-effort).
2. Re-run `npm run validate:sources` before any sources.ts work — feeds rot.
3. Update [CHANGELOG.md](./CHANGELOG.md) when items ship; move them to the completed table above.
