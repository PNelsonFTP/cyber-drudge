# CYBER DRUDGE

A Drudge-Report-style cybersecurity news aggregator. Three dense columns, FT blue/orange palette, monospace masthead, light/dark/system themes — covering breaking threats, vulnerabilities, threat intel, breaches, malware analysis, IR, policy, vendor news, and more.

**Live site:** https://pnelsonftp.github.io/cyber-drudge/

Headlines are fetched at **build time** by a GitHub Actions hourly cron job and written to `public/data/*.json`. The deployed site is a pure static SPA — no live RSS scraping in the request path.

## Documentation

Full technical documentation lives in [`docs/`](./docs/README.md):

| Document | Description |
| -------- | ----------- |
| [Architecture](./docs/ARCHITECTURE.md) | System design, data flow, scoring, deployment |
| [SBOM](./docs/SBOM.md) | Software Bill of Materials |
| [Migration](./docs/MIGRATION.md) | **New computer, directory, repo rename, custom domain** |
| [Handoff](./docs/HANDOFF.md) | Operations runbook for maintainers |
| [Future improvements](./docs/FUTURE-IMPROVEMENTS.md) | Next upgrade cycle backlog (12+ items) |
| [Changelog](./docs/CHANGELOG.md) | Release history (v1.0.0 → v1.2.0) |

## Stack

- Vite 6 + React 19 + TypeScript 5.9
- Tailwind v4 (via `@tailwindcss/vite`)
- `fast-xml-parser` v5 (build-time only — never bundled)
- `tsx` for build scripts
- GitHub Pages + GitHub Actions (Node 24, SHA-pinned actions, Dependabot)

**Sources:** 91 RSS/Atom feeds + 1 HTML scrape + CISA KEV, across 18 categories.

## Develop

```bash
npm install
npm run build:data     # fetch feeds, write public/data/*.json
npm run dev            # local dev server → http://localhost:5173/cyber-drudge/
```

Open **`http://localhost:5173/cyber-drudge/`** (Vite `base` includes the repo name).

## Deploy

1. Push this repo to GitHub. The repo name matters for the base path — if you rename it, update `base` in `vite.config.ts` to match (`/<repo-name>/`).
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. The workflow at `.github/workflows/refresh.yml` runs on push and hourly (`5 * * * *`). On the first push it will fetch feeds, build the site, and deploy to:

   ```
   https://<username>.github.io/<repo>/
   ```

4. (Optional) Add `ANTHROPIC_API_KEY` as a repo Actions secret to enable the LLM daily brief. Without the key, a curated brief is produced from trending + lead story.

## Add / remove a feed

Edit `scripts/sources.ts` only. Find the right category block and append a line:

```ts
{ name: "My Source", url: "https://example.com/feed.xml", category: "threat_intelligence", priority: "high" },
```

That's it. The hourly cron picks it up on the next run. No other file needs to change.

Then validate the whole source list live (HTTP, XML shape, item count, staleness):

```bash
npm run validate:sources
```

### Categories

The 18 categories live in `scripts/sources.ts` (`CATEGORIES`). Common ones:

| ID                    | Label                  |
| --------------------- | ---------------------- |
| `breaking_threats`    | BREAKING THREATS       |
| `vulnerabilities`     | VULNERABILITIES        |
| `malware_analysis`    | MALWARE ANALYSIS       |
| `threat_intelligence` | THREAT INTELLIGENCE    |
| `data_breaches`       | DATA BREACHES          |
| `phishing_fraud`      | PHISHING & FRAUD       |
| `cloud_security`      | CLOUD SECURITY         |
| `network_endpoint`    | NETWORK & ENDPOINT     |
| `identity_access`     | IDENTITY & ACCESS      |
| `ai_security`         | AI SECURITY            |
| `crypto_pqc`          | CRYPTO & PQC           |
| `ics_ot`              | ICS/OT SECURITY        |
| `policy_regulation`   | POLICY & REGULATION    |
| `vendor_product`      | VENDOR & PRODUCT NEWS  |
| `incident_response`   | INCIDENT RESPONSE      |
| `bug_bounty_research` | BUG BOUNTY & RESEARCH  |
| `security_tools`      | SECURITY TOOLS         |
| `offense_red_team`    | OFFENSE / RED TEAM     |

### Keyword routing

Articles are placed in their feed's home category plus any category whose keyword list matches title+summary. To add a rule, edit the `KEYWORDS` array in `scripts/sources.ts`:

```ts
{ match: ["my keyword", "prefix*"], routeTo: "vulnerabilities" },
```

Keywords match **whole words** (case-insensitive); a trailing `*` enables prefix matching (`"encrypt*"` matches *encrypted*, *encryption*). Sources listed in `KEYWORD_AGNOSTIC_SOURCES` (community aggregators and digests like Lobsters, HN, This Week in 4n6) skip keyword routing — their generic titles match too broadly.

## Quality bar

- `npm run typecheck` exits 0; `npm audit` reports 0 vulnerabilities.
- `npm run build` produces a `dist/` under ~75KB gzipped JS+CSS (excluding JSON).
- `npm run build:data` produces a `headlines.json` with zero HTML entities in any title.
- `npm run validate:sources` shows no FAIL entries (STALE is a warning — some quality sources post monthly).
- Every section has at least 2 distinct sources; every source is capped at 6 items globally.

## Architecture notes (the one rule)

**Never do live RSS scraping inside the deployed app.** All scraping happens in `scripts/build-data.ts`, which runs in GitHub Actions hourly. The deployed site is a pure static SPA that loads three JSON files (`headlines.json`, `stocks.json`, `brief.json`). This eliminates the entire class of 90-second page blocks, OOM kills, rate-limit crashes, and brittle client-side refresh state machines.

If a feed fetch fails entirely, the previous `headlines.json` is preserved and the deploy still ships the last good state.

## Reconciling cron commits locally

The cron commits refreshed JSON to `main`. When you `git pull --rebase` afterwards you may hit conflicts on `public/data/*.json`. Resolve with:

```bash
git checkout --ours public/data/ && git add public/data/ && GIT_EDITOR=true git rebase --continue
```

Always `git pull --rebase` before pushing — the cron may have committed since your last sync.

## Project layout

```
.
├── docs/                             # Full documentation (start at docs/README.md)
├── .github/
│   ├── workflows/refresh.yml         # typecheck -> build:data -> build:check -> deploy
│   └── dependabot.yml                # weekly npm + actions updates
├── index.html                        # %BASE_URL% placeholders — no hard-coded paths
├── vite.config.ts                    # base path — the only file that embeds the repo name
├── scripts/
│   ├── sources.ts                    # ★ feeds, categories, age windows, keywords
│   ├── build-data.ts                 # orchestrator
│   ├── fetch-feeds.ts
│   ├── fetch-kev.ts                  # CISA KEV catalog
│   ├── fetch-stocks.ts
│   ├── scrape-sources.ts
│   ├── generate-brief.ts
│   ├── check-data.ts                 # npm run build:check
│   ├── validate-sources.ts           # npm run validate:sources (live link checks)
│   ├── types.ts
│   └── lib/
│       ├── score.ts                  # shared ranking
│       ├── router.ts
│       ├── groupStories.ts
│       └── timeAgo.ts
├── public/data/                      # generated JSON (committed by cron)
└── src/                              # React SPA
```
