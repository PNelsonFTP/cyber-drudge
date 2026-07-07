# Operations Handoff Document

**Project:** Cyber Drudge
**Version:** 1.2.0
**Handoff date:** 2026-07-07
**Repo:** https://github.com/PNelsonFTP/cyber-drudge
**Live site:** https://pnelsonftp.github.io/cyber-drudge/

---

## 1. What you are inheriting

A fully deployed, hourly-refreshed cybersecurity news aggregator at **v1.2.0**:

- **91 RSS/Atom feeds** + 1 HTML scrape + CISA KEV catalog (all 92 sources live-validated 2026-07-07)
- **18 topic categories** in a 3-column Drudge layout — all populated, none single-source starved
- **Shared scoring** with freshness windows, importance signals, and KEV boosts (KEV detection repaired in v1.2 — it had been silently dead)
- **Static React SPA** on GitHub Pages
- **Automated CI** on Node 24 with typecheck, data health check, hourly refresh, SHA-pinned actions, Dependabot, and deploy

No servers. No database. Optional Anthropic API cost for LLM brief only.

**Know these two v1.2 quirks:**
1. *Industrial Cyber* fetches with a static cookie header (`SentryVerifiedJS=true` — the value the site's own JS sets). If their bot check changes, the feed fails soft; see FUTURE-IMPROVEMENTS "Deferred decisions."
2. *CISA KEV Additions* is a third-party RSS bridge (kevin.gtfkd.com) used for headlines only — KEV scoring reads CISA's JSON directly and is unaffected if the bridge dies.

---

## 2. Moving to a new computer

See **[MIGRATION.md](./MIGRATION.md)** for the full portability guide. Summary:

```bash
git clone https://github.com/PNelsonFTP/cyber-drudge.git
cd cyber-drudge          # folder name on disk is arbitrary
npm ci
npm run typecheck
npm run build
npm run dev              # → http://localhost:5173/cyber-drudge/
```

**No absolute paths in code.** Only `vite.config.ts` and `index.html` embed the repo name `/cyber-drudge/` for GitHub Pages — update those if you rename the repo.

---

## 3. Access and accounts

| Resource | Location |
| -------- | -------- |
| Source code | GitHub: `PNelsonFTP/cyber-drudge` |
| GitHub Pages | Settings → Pages → Source: **GitHub Actions** |
| Workflow runs | Actions → "Refresh and Deploy" |
| Optional secret | Settings → Secrets → `ANTHROPIC_API_KEY` |

---

## 4. Daily operations (usually zero touch)

The site refreshes **every hour at :05 UTC** via cron.

**Normal state:**

- `chore(data): hourly refresh [skip ci]` commits when feed data changes
- Green workflow runs
- Masthead shows "updated Xm ago"

---

## 5. Common maintenance tasks

### 5.1 Add or remove a feed

**File:** `scripts/sources.ts`

```typescript
{ name: "Source Name", url: "https://example.com/feed.xml", category: "threat_intelligence", priority: "high" }
```

For GitHub releases:

```typescript
{ name: "org/repo", url: "https://github.com/org/repo/releases.atom", category: "security_tools", type: "github-release", maxItems: 3 }
```

For huge archive feeds, set `maxItems` (10 is typical). For a feed behind a
simple header check, add `headers: { ... }`.

**Always validate before and after:**

```bash
npm run validate:sources        # live-checks every feed, ticker, KEV, scrape
```

### 5.2 Tune freshness

Edit `softAgeHours` / `maxAgeHours` on category entries in `scripts/sources.ts`, or constants in `scripts/lib/score.ts` (`HALF_LIFE_HOURS`, etc.).

### 5.3 Tune keyword routing

`KEYWORDS` in `scripts/sources.ts`. Matching is whole-word; append `*` for
prefix matching (`"encrypt*"`). Add generic-title sources (digests, community
aggregators) to `KEYWORD_AGNOSTIC_SOURCES` or they pollute every category.

### 5.4 Run health check locally

```bash
npm run build:data      # requires network (may fail in restricted sandboxes)
npm run build:check     # reads public/data/headlines.json
npm run build:check -- --strict   # exit 1 on warnings
npm run validate:sources          # live per-source validation + staleness
```

### 5.5 Manual refresh

GitHub → Actions → "Refresh and Deploy" → **Run workflow**

---

## 6. Deployment pipeline

| Step | Action |
| ---- | ------ |
| Checkout | Clone `main` (actions SHA-pinned) |
| Setup Node 24 | `npm ci` |
| Typecheck | `npm run typecheck` |
| Build data | Fetch 92 sources + KEV → JSON |
| Data health check | `npm run build:check` (warn-only) |
| Commit JSON | If changed → rebase on origin → `chore(data): hourly refresh [skip ci]` |
| Build site | Vite → `dist/` |
| Deploy Pages | `https://pnelsonftp.github.io/cyber-drudge/` (github-pages environment) |

Job timeout: 15 minutes. Dependabot PRs arrive Mondays (npm grouped + actions).

---

## 7. Troubleshooting

| Issue | Fix |
| ----- | --- |
| Git push rejected | `git pull --rebase origin main` |
| JSON conflicts on pull | `git checkout --ours public/data/` or regenerate with `build:data` |
| Blank page after rename | Align `vite.config.ts` `base` — see MIGRATION.md (index.html follows automatically since v1.2) |
| Feed suddenly EMPTY/FAIL | `npm run validate:sources` to triage: bot wall vs dead URL vs zombie blog |
| Feed parse errors | Check `feedStats` in headlines.json; HTML body rejection is intentional |
| Outflank 403 | Blocks some IPs; passes from Actions. If CI starts failing too, drop it |
| Industrial Cyber EMPTY | Their Sentry bot-check changed — remove the feed's `headers` workaround or the feed itself |
| Ticker missing from bar | Symbol delisted or Yahoo hiccup — `npm run validate:sources` shows per-ticker status |
| Thin single-source sections | Add niche feeds in `sources.ts`; check category age windows first |

---

## 8. Monitoring checklist (weekly)

| Signal | How |
| ------ | --- |
| Workflow health | Actions → last 24 runs green |
| Feed success | `npm run build:check` → ok/total ≥ 90% |
| Data freshness | Masthead "updated" < 2h |
| Stale content | `build:check` category median ages |
| Zombie feeds (monthly) | `npm run validate:sources` → review STALE entries |
| Dependabot PRs | Merge Monday's grouped PR after CI passes |
| Type errors | `npm run typecheck` |

---

## 9. Documentation index

| Document | Purpose |
| -------- | ------- |
| [README.md](./README.md) | Doc index |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design |
| [SBOM.md](./SBOM.md) | Dependencies |
| [MIGRATION.md](./MIGRATION.md) | **New machine / rename / custom domain** |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |
| [UPGRADE-PLAN.md](./UPGRADE-PLAN.md) | Completed v1.1 plan (reference) |
| [FUTURE-IMPROVEMENTS.md](./FUTURE-IMPROVEMENTS.md) | Next cycle backlog |

---

## 10. Delivered milestones

| Milestone | Version | Status |
| --------- | ------- | ------ |
| Initial aggregator | 1.0.0 | ✅ |
| GitHub Pages + hourly cron | 1.0.0 | ✅ |
| FT theme + AI-Drudge UI | 1.0.0 | ✅ |
| Time-decay ranking + stocks fix | 1.0.0 | ✅ |
| Full documentation | 1.0.0 | ✅ |
| Freshness / importance / sources upgrade | 1.1.0 | ✅ |
| CISA KEV + shared scoring | 1.1.0 | ✅ |
| build:check + CI typecheck | 1.1.0 | ✅ |
| Migration / portability docs | 1.1.0 | ✅ |
| Full overhaul: link validation, 53 audit fixes, +35 sources | 1.2.0 | ✅ |
| KEV repair + word-boundary routing | 1.2.0 | ✅ |
| validate:sources + CI hardening (Node 24, SHA pins, Dependabot) | 1.2.0 | ✅ |
| a11y + theme flash + hover/touch fixes | 1.2.0 | ✅ |

---

## 11. New maintainer checklist

- [ ] Read [MIGRATION.md](./MIGRATION.md) if moving machines or renaming repo
- [ ] Clone, `npm ci`, `npm run dev` at `/cyber-drudge/` path
- [ ] Understand **no live RSS in browser**
- [ ] Know `scripts/sources.ts` is the main edit surface
- [ ] Run `npm run validate:sources` once and read its output
- [ ] Can read Actions logs and `npm run build:check` output
- [ ] Has GitHub admin (Pages + optional Secrets)
- [ ] Read [ARCHITECTURE.md](./ARCHITECTURE.md) scoring section
- [ ] Read the two v1.2 quirks in §1 (Industrial Cyber cookie, KEV bridge)

---

## 12. Emergency rollback

```bash
git revert <bad-commit-sha>
git push origin main
```

Workflow redeploys automatically. For bad JSON only, restore `public/data/` from a prior commit or re-run workflow.
