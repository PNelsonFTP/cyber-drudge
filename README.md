# CYBER DRUDGE

A Drudge-Report-style cybersecurity news aggregator. Three dense columns, red masthead, monospace accents, dark mode by default — covering breaking threats, vulnerabilities, threat intel, breaches, malware analysis, IR, policy, vendor news, and more.

Headlines are fetched at **build time** by a GitHub Actions hourly cron job and written to a single `public/data/headlines.json`. The deployed site is a pure static SPA — no live RSS scraping in the request path.

## Stack

- Vite 6 + React 19 + TypeScript 5.8
- Tailwind v4 (via `@tailwindcss/vite`)
- `fast-xml-parser` (build-time only — never bundled)
- `tsx` for build scripts
- GitHub Pages + GitHub Actions

## Develop

```bash
npm install
npm run build:data     # fetch feeds, write public/data/*.json
npm run dev            # local dev server
```

Open the URL Vite prints (typically http://localhost:5173).

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
{ match: ["my keyword", "another"], routeTo: "vulnerabilities" },
```

Sources listed in `KEYWORD_AGNOSTIC_SOURCES` (e.g. `r/netsec`, `r/cybersecurity`) skip keyword routing — their generic titles match too broadly.

## Quality bar

- `npm run typecheck` exits 0.
- `npm run build` produces a `dist/` under ~250KB gzipped (excluding JSON).
- `npm run build:data` produces a `headlines.json` with zero HTML entities in any title.
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
├── .github/workflows/refresh.yml     # hourly cron -> build:data -> commit -> deploy
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts                    # base path matches repo name
├── scripts/
│   ├── sources.ts                    # FEEDS + CATEGORIES + KEYWORDS (user edits this)
│   ├── types.ts
│   ├── fetch-feeds.ts                # parallel RSS w/ timeouts, retry, UA rotation
│   ├── scrape-sources.ts             # HTML scraper for no-RSS sites
│   ├── fetch-stocks.ts               # CRWD, PANW, S, FTNT, ZS, OKTA, SNET
│   ├── generate-brief.ts             # LLM brief if ANTHROPIC_API_KEY set, else curated
│   ├── build-data.ts                 # orchestrator -> writes public/data/*.json
│   └── lib/
│       ├── timeAgo.ts                # 9 date-extraction patterns
│       ├── groupStories.ts           # Jaccard >=0.4 same-story clustering
│       └── router.ts                 # global cap (6), keyword routing, trending
├── public/
│   ├── favicon.svg
│   └── data/                         # generated: headlines.json, stocks.json, brief.json
└── src/
    ├── App.tsx                       # 3-column Drudge layout, 3 views
    ├── main.tsx
    ├── styles.css                    # Tailwind v4 import + Drudge typography
    ├── components/
    │   ├── Header.tsx
    │   ├── StockTicker.tsx
    │   ├── DailyBrief.tsx
    │   ├── Trending.tsx
    │   ├── LeadStory.tsx
    │   ├── CategoryColumn.tsx
    │   ├── Headline.tsx
    │   ├── HoverCard.tsx
    │   └── ManageMutes.tsx
    ├── hooks/
    │   ├── useLocalStorageSet.ts     # powers bookmarks, queue, muted sources/cats
    │   ├── useHeadlines.ts           # stale-while-revalidate
    │   └── useTheme.ts               # dark/light/system
    └── lib/
        ├── types.ts
        └── timeAgo.ts                # client-side display formatter
```
