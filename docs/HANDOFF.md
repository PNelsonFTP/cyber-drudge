# Operations Handoff Document

**Project:** Cyber Drudge  
**Handoff date:** 2026-06-18  
**Maintainer repo:** https://github.com/PNelsonFTP/cyber-drudge  
**Live site:** https://pnelsonftp.github.io/cyber-drudge/

---

## 1. What you are inheriting

A fully deployed, hourly-refreshed cybersecurity news aggregator:

- **50 RSS/Atom feeds** + 1 HTML scrape source
- **18 topic categories** in a 3-column Drudge layout
- **Static React SPA** on GitHub Pages
- **Automated CI** that fetches data, commits JSON, builds, and deploys

No servers to manage. No database. No billing (unless you add Anthropic API usage for the daily brief).

---

## 2. Access and accounts

| Resource | Location |
| -------- | -------- |
| Source code | GitHub: `PNelsonFTP/cyber-drudge` |
| GitHub Pages | Settings → Pages → Source: **GitHub Actions** |
| Workflow runs | Actions tab → “Refresh and Deploy” |
| Optional secret | Settings → Secrets → `ANTHROPIC_API_KEY` |

---

## 3. Daily operations (usually zero touch)

The site refreshes automatically **every hour at :05** UTC via cron.

**Normal state:**

- New `chore(data): hourly refresh [skip ci]` commits on `main` when feed data changes
- Green workflow runs in Actions
- Live site shows updated `generatedAt` timestamp in the UI

**You do not need to:**

- Run a server
- Manually deploy (unless debugging)
- Restart anything

---

## 4. Common maintenance tasks

### 4.1 Add or remove a feed

**File:** `scripts/sources.ts`

```typescript
{ name: "Source Name", url: "https://example.com/feed.xml", category: "threat_intelligence", priority: "high" }
```

Push to `main`. The next workflow run picks it up.

**Categories** must use an existing `CategoryId`. **Priority** is optional (`critical` | `high` | `normal`).

### 4.2 Change category layout

Edit `CATEGORIES` in `scripts/sources.ts` — set `column: "left" | "center" | "right"`.

### 4.3 Add keyword routing

Edit `KEYWORDS` in `scripts/sources.ts`:

```typescript
{ match: ["ransomware", "lockbit"], routeTo: "malware_analysis" }
```

Remember: `KEYWORD_AGNOSTIC_SOURCES` (Reddit) will not keyword-route.

### 4.4 Change stock tickers

Edit `STOCK_TICKERS` in `scripts/sources.ts`. Verify Yahoo returns data:

```bash
npm run build:data
cat public/data/stocks.json
```

### 4.5 Enable LLM daily brief

1. Create GitHub secret `ANTHROPIC_API_KEY`
2. Re-run workflow or wait for next cron
3. Check `public/data/brief.json` for non-fallback content

### 4.6 Manual refresh

GitHub → Actions → “Refresh and Deploy” → **Run workflow**

### 4.7 Local development

```bash
git clone https://github.com/PNelsonFTP/cyber-drudge.git
cd cyber-drudge
npm ci
npm run build:data    # optional — refreshes public/data/*.json
npm run dev           # http://localhost:5173/cyber-drudge/
```

**Note:** Vite `base` is `/cyber-drudge/` — use that path locally.

### 4.8 Local production preview

```bash
npm run build
npm run preview
```

---

## 5. Deployment pipeline (step by step)

Workflow: `.github/workflows/refresh.yml`

| Step | What happens |
| ---- | ------------ |
| Checkout | Clone `main` |
| Setup Node 20 | `npm ci` with cache |
| `npm run build:data` | Fetch feeds, route, write JSON |
| Commit JSON | If `public/data/*.json` changed → `chore(data): hourly refresh [skip ci]` |
| `npm run build` | Vite → `dist/` |
| Deploy Pages | Upload artifact, deploy to `pnelsonftp.github.io/cyber-drudge/` |

**Push to `main`** also triggers a full run (code changes deploy immediately).

---

## 6. Troubleshooting

### 6.1 Git push rejected after local work

The hourly cron commits JSON to `main`. Before pushing:

```bash
git pull --rebase origin main
```

If JSON conflicts:

```bash
git checkout --ours public/data/*.json   # keep remote/cron data
# or regenerate:
npm run build:data
git add public/data/
git rebase --continue
```

### 6.2 Workflow failed on `build:data`

1. Open the failed Actions log
2. Look for `[build:data]` lines — which feeds failed?
3. Check `feedStats` in the last good `headlines.json`
4. Common causes: feed URL moved, TLS errors, timeout (8s), empty feed

**Site still works** if previous `headlines.json` exists (graceful degradation).

### 6.3 All stocks show 0% change

- Verify Yahoo API in `fetch-stocks.ts`
- Run `npm run build:data` locally and inspect `stocks.json`
- Do not re-add Stooq without verifying the endpoint (was returning 404 HTML)

### 6.4 Stale lead story

- Ranking uses time-decay (72h half-life) + 14-day cap
- If still stale, check article `publishedAt` parsing in `timeAgo.ts`
- CISA feeds sometimes emit future dates (clamped to `now`)

### 6.5 Hover card unreadable

- Light/dark styles in `src/styles.css` → `.hover-card`
- Must set `background: var(--color-surface-2)`

### 6.6 Empty category sections

- Normal when a niche category has no recent matches
- `ai_security` and `security_tools` occasionally show single-source sections during feed droughts
- Add feeds or adjust keywords in `sources.ts`

### 6.7 GitHub Pages 404

- Confirm Pages source is **GitHub Actions** (not `main` /docs)
- Confirm `vite.config.ts` `base: "/cyber-drudge/"` matches repo name
- Confirm last deploy step succeeded

### 6.8 Node 20 deprecation warning in Actions

GitHub will eventually require Node 24. Update `node-version` in `refresh.yml` during next upgrade cycle.

---

## 7. Monitoring checklist

Run weekly (or automate later):

| Signal | How to check |
| ------ | ------------ |
| Workflow health | Actions → last 24 runs green? |
| Feed success rate | `feedStats` in `headlines.json`: `ok / total` |
| Data freshness | `generatedAt` < 2 hours old |
| Stock quotes | `stocks.json` has 7 tickers with non-zero `price` |
| Bundle regressions | `npm run build` — JS gzip ~67 KB |
| Type errors | `npx tsc --noEmit` |

---

## 8. Secrets and compliance

| Secret | Required? | Used for |
| ------ | --------- | -------- |
| `ANTHROPIC_API_KEY` | No | LLM daily brief only |
| `GITHUB_TOKEN` | Auto | Actions (commit + Pages deploy) |

**Do not commit:** API keys, `.env` files, credentials.

---

## 9. Key contacts and references

| Item | Link |
| ---- | ---- |
| Live site | https://pnelsonftp.github.io/cyber-drudge/ |
| Sister project (design reference) | https://pnelsonftp.github.io/ai-drudge/ |
| Architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| SBOM | [SBOM.md](./SBOM.md) |
| Future work | [FUTURE-IMPROVEMENTS.md](./FUTURE-IMPROVEMENTS.md) |
| Change history | [CHANGELOG.md](./CHANGELOG.md) |

---

## 10. Handoff verification checklist

Use this when onboarding a new maintainer:

- [ ] Can clone repo and run `npm ci && npm run dev`
- [ ] Understands **no live RSS in browser** rule
- [ ] Knows `scripts/sources.ts` is the main edit surface
- [ ] Can read Actions logs for feed failures
- [ ] Knows `git pull --rebase` before push
- [ ] Has GitHub admin access (Pages + Secrets if using LLM brief)
- [ ] Has read `ARCHITECTURE.md` routing/scoring section
- [ ] Confirmed live site loads and theme toggle works

---

## 11. Emergency rollback

If a bad deploy reaches production:

1. Identify last good commit on `main` (before broken code change — not data-only cron commits)
2. Revert the code commit:

```bash
git revert <commit-sha>
git push origin main
```

3. Workflow redeploys automatically

**Data-only bad JSON:** run workflow manually after fixing `build-data` scripts, or restore `public/data/` from a prior commit.

---

## 12. What was delivered in this build cycle

| Milestone | Status |
| --------- | ------ |
| Full aggregator from `cyber-drudge-prompt.md` | ✅ |
| GitHub repo + Pages deploy | ✅ |
| FT color scheme + section headers | ✅ |
| Center column layout balance | ✅ |
| AI-Drudge design language (10 items) | ✅ |
| Dark mode hover card fix | ✅ |
| Time-decay ranking + stock fix | ✅ |
| Full documentation (this set) | ✅ |
