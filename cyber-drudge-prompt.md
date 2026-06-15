# PROMPT: Build a Drudge-Report-style cybersecurity news aggregator

Run this in a fresh empty directory (e.g. `cyber-drudge/`) in a new Cursor agent. The agent should produce a complete working site that deploys to GitHub Pages within ~30 minutes.

---

## What to build

A static-site news aggregator that looks like Drudge Report (3 dense columns, red masthead, monospace accents, dark mode default) but covers all areas of cybersecurity instead of politics/general news. Architecture: **Vite 6 + React 19 + TypeScript + Tailwind v4 + fast-xml-parser**, deployed as a static SPA to GitHub Pages. Headlines are fetched at BUILD time by a GitHub Actions hourly cron job (NOT at request time) and written to a single `public/data/headlines.json`. The deployed site loads one JSON file.

**This is a from-scratch build using a proven architecture** — every design decision below was learned the hard way on a previous (AI-news) version of this site. Do not deviate from the architecture unless the user explicitly approves.

## The one rule that matters most

**Never do live RSS scraping inside the deployed app.** All scraping happens in a build script (`scripts/build-data.ts`) that runs in GitHub Actions hourly. The deployed site is a pure static SPA that loads `data/headlines.json`. This single architectural choice eliminates: 90-second page blocks, OOM kills, rate-limit crashes, blank pages during refresh, and the brittle client-side `refreshing`/`hasLoadedOnce`/`justUpdated` state machinery that breaks JSX. Do not introduce any of those patterns — there is no client-side refresh to manage.

## Required stack (use these exact versions/patterns)

- **Vite 6 + React 19 + TypeScript 5.8 + Tailwind v4** (via `@tailwindcss/vite`)
- **`fast-xml-parser`** for RSS parsing (build-time only — never in the browser bundle)
- **`tsx`** for running the build scripts
- **GitHub Pages** for hosting; **GitHub Actions** for the hourly cron
- **No Next.js, no server, no API routes, no SSR, no database.**

## Required project structure

```
<repo>/
├── .github/workflows/refresh.yml       # hourly cron -> build:data -> commit-if-changed -> deploy
├── index.html                          # includes <link rel="preload"> for the 3 JSON files
├── package.json
├── tsconfig.json
├── vite.config.ts                      # base path matches repo name
├── scripts/
│   ├── sources.ts                      # FEED LIST + CATEGORIES + KEYWORDS (this is where the user adds feeds)
│   ├── fetch-feeds.ts                  # parallel RSS fetch with timeouts/retry/UA rotation
│   ├── scrape-sources.ts               # HTML scraper for no-RSS sites (CrowdStrike, Palo Alto, etc.)
│   ├── fetch-stocks.ts                 # optional: tracked cybersecurity stocks (CRWD, PANW, S, FTNT, etc.)
│   ├── generate-brief.ts               # optional: LLM daily brief if ANTHROPIC_API_KEY is set
│   ├── build-data.ts                   # orchestrator: fetch -> route -> write JSON
│   ├── types.ts
│   └── lib/
│       ├── timeAgo.ts                  # 9 date-extraction patterns
│       ├── groupStories.ts             # Jaccard ≥0.4 same-story clustering
│       └── router.ts                   # multi-category routing + per-source global cap + diversity
├── public/
│   ├── favicon.svg
│   └── data/                           # generated: headlines.json, stocks.json, brief.json
└── src/
    ├── App.tsx                         # 3-column Drudge layout, 3 views (home/bookmarks/queue)
    ├── main.tsx
    ├── styles.css                      # Tailwind v4 import + Drudge typography
    ├── vite-env.d.ts
    ├── components/
    │   ├── Header.tsx                  # toolbar: theme, bookmarks, queue, manage-mutes
    │   ├── StockTicker.tsx             # dark bar with ▲/▼ (if you include stocks)
    │   ├── DailyBrief.tsx
    │   ├── Trending.tsx                # top stories covered by 2+ outlets
    │   ├── LeadStory.tsx               # center column, biggest story
    │   ├── CategoryColumn.tsx          # section with source count, View All, mute-cat, mobile accordion
    │   ├── Headline.tsx                # bookmark + queue + mute-source buttons
    │   ├── HoverCard.tsx               # 200ms hide delay preview card
    │   └── ManageMutes.tsx             # modal to restore muted sources/categories
    ├── hooks/
    │   ├── useLocalStorageSet.ts       # GENERIC hook — powers bookmarks, queue, muted sources, muted categories
    │   ├── useHeadlines.ts             # stale-while-revalidate (instant for returning users)
    │   └── useTheme.ts                 # dark/light/system
    └── lib/
        ├── types.ts
        └── timeAgo.ts                  # client-side display formatter
```

## Required features (these were all battle-tested on the AI version)

### Build-time (in scripts/)

1. **Parallel RSS fetch** with 8s per-feed timeout, 1 retry, rotating User-Agents. `Promise.all` so one bad feed never blocks others. Cap 15 items per feed. (`fetch-feeds.ts`)
2. **HTML entity decoding** — feeds leak `&#8217;` `&amp;` etc. Always run titles and summaries through `decodeEntities()` after stripping HTML.
3. **GitHub release feed noise filter** — drop titles that are pure version tags (`b9637`, `v0.30.4`) or have <3 real words after stripping the version prefix. Keep ones like `Release v5.10.1: Add Mistral support`.
4. **Per-feed entity expansion limit raised** in fast-xml-parser config (default 1000 trips legitimate feeds):
   ```ts
   new XMLParser({
     ignoreAttributes: false,
     attributeNamePrefix: "@_",
     processEntities: {
       enabled: true,
       maxEntitySize: 100000,
       maxTotalExpansions: 100000,
       maxExpandedLength: 1000000,
       maxEntityCount: 100000,
     },
   });
   ```
5. **HTML scraper** for sites with no public RSS (in cybersecurity this includes: CrowdStrike blog, Palo Alto Unit 42, SentinelOne, Mandiant — many vendor blogs are SPA-only). Each scraper config has `listingUrl`, `cardPattern` (regex), `maxItems`. Runs in parallel with RSS fetch. (`scrape-sources.ts`)
6. **Multi-category routing** with `KEYWORDS` map — each article goes to its feed's home category PLUS any category whose keywords match title+summary. This is how you get fresh + diverse sections instead of "each section = one source". (`scripts/lib/router.ts`)
7. **Per-source global cap** of 6 articles per source per build across the entire site. Without this, a high-volume source floods every category. Apply BEFORE routing. Input must be sorted by priority+recency first so the cap keeps the most-important items.
8. **Per-source diversity cap within each category** (3-5 items depending on category's source count).
9. **Same-story grouping** via Jaccard title-token similarity ≥0.4. (`groupStories.ts`)
10. **Trending section** — stories covered by 2+ distinct outlets, unified across categories via Jaccard title match. (`router.ts` computes this; payload includes top-level `trending[]`.)
11. **9 date-extraction patterns**: `<N> <unit> ago`, `Last week/month`, RFC822, ISO, day-first `12 Jun 2025`, slash dates, compact URL `/20250614`, month+day no year. (`timeAgo.ts`)
12. **Graceful degradation** — if every feed fails, keep the previous `headlines.json` and exit 0 so the deploy ships the last good state. NEVER let the site go blank.
13. **Minified JSON output** (use `JSON.stringify(data)` with no indent) — smaller payload for the SPA to fetch.
14. **Stock ticker** for sector-relevant tickers — for cybersecurity use **CRWD, PANW, S (SentinelOne), FTNT, ZS, OKTA, SNET** if you want one. Use Stooq (free, no key) with Yahoo fallback. Silent fail to `{}`. (`fetch-stocks.ts`)
15. **Optional LLM daily brief** gated on `ANTHROPIC_API_KEY` secret. System prompt forbids inventing stories/models/quotes (anti-hallucination). Without the key, fall back to a curated brief: top trending + lead story + 1 each from up to 3 distinct categories (cyber threats / zero-days / vendor news etc). (`generate-brief.ts`)

### Client-side (in src/)

1. **Drudge-style 3-column layout** — masthead "CYBER DRUDGE" in red, dense typography, monospace accents, siren-red for `priority: critical`.
2. **Dark/light/system theme** persisted in localStorage (`useTheme`).
3. **Stale-while-revalidate data loading** — seed state from sessionStorage on first paint, silently revalidate in background. Network failure while cache exists = keep cache silently, no error. (`useHeadlines`)
4. **Preload the 3 JSON files** via `<link rel="preload" as="fetch" crossorigin="anonymous">` in index.html so the browser fetches them in parallel with JS parsing.
5. **3 views**: home (default), bookmarks (saved permanently), queue (read-later, clears on click). Header has 4 toolbar buttons: ★ bookmarks count, ◷ queue count, ✕ muted count, theme toggle.
6. **Trending section** at top — red-bordered box, ranked list with source-count badge.
7. **Lead story** in center column — biggest story, red siren treatment, "Also covered by" links.
8. **Per-section features** in `CategoryColumn`:
   - Source count next to heading ("7 src")
   - "View all N" expansion (data carries `articlesAll` with 20-40 items per category)
   - ✕ button to mute the whole category
   - **Mobile accordion** — section heading is tap-to-expand on phone-width (`md:hidden` caret), always-expanded on desktop
9. **Per-headline features** in `Headline`:
   - ☆ bookmark button (left)
   - ◷ read-later button
   - source badge + time-ago
   - hover reveals "mute" link to hide that source
10. **Hover preview card** — fixed-position card on headline hover, 200ms hide delay so the user can move the mouse into it. Shows title, source, time-ago, snippet, related sources, "Read article →". (`HoverCard.tsx` + `useHoverCard` hook)
11. **Mute filters apply everywhere** — muted sources and muted categories filter across all 3 views (home, bookmarks, queue), not just the home view.
12. **Manage-mutes modal** — click ✕ N in header → modal listing everything muted with one-click "restore".
13. **Search bar** in header — client-side filter across title, source, category label, related sources.
14. **Footer** shows "X/Y feeds OK" from `feedStats` so the user can see collection health.

## Cybersecurity-specific content design

The section structure should mirror how the cybersecurity world is actually organized. Suggested 16-18 categories (user can edit `sources.ts` later):

```
BREAKING THREATS        — active incidents, ransomware, 0-days being exploited
VULNERABILITIES         — CVE disclosures, patch releases
MALWARE ANALYSIS        — reverse engineering, new families
THREAT INTELLIGENCE     — APT reports, attribution, campaigns
DATA BREACHES           — disclosed breaches, leaks
PHISHING & FRAUD        — social engineering, BEC, scam infrastructure
CLOUD SECURITY          — AWS/Azure/GCP misconfigs, IAM, SaaS
NETWORK & ENDPOINT      — EDR/XDR/SIEM, detection engineering
IDENTITY & ACCESS       — Okta/Entra/SAML, MFA, identity threats
AI SECURITY             — prompt injection, model attacks, AI red team
CRYPTO & PQC            — crypto flaws, post-quantum migration
ICS/OT SECURITY         — industrial, SCADA, critical infrastructure
POLICY & REGULATION     — CISA, EU NIS2, SEC cyber disclosure, nation-state
VENDOR & PRODUCT NEWS   — Crowdstrike/Palo Alto/SentinelOne/Mandiant etc
INCIDENT RESPONSE       — IR playbooks, forensics, lessons learned
BUG BOUNTY & RESEARCH   — HackerOne, Bugcrowd, Project Zero write-ups
SECURITY TOOLS          — open source releases (GitHub feeds!)
OFFENSE / RED TEAM      — offensive tradecraft, red team tooling
```

### Suggested RSS feeds (starting set — verify URLs work, ~5 will be dead and need replacing)

**Independent press / news:**
BleepingComputer (`/feed/`), The Hacker News (`feeds.feedburner.com/TheHackersNews`), Dark Reading (`/rss.xml`), The Record (`therecord.media/feed/`), Krebs on Security (`/feed/`), SecurityWeek (`/rss.xml`), CyberScoop (`/feed/`), SC Magazine (`/rss`), InfoRisk Today (`/rss`), BankInfoSecurity (`/rss`), Phishing News (search).

**Vendor research blogs (some need scraping — many are SPA-only):**
Google Project Zero (`googleprojectzero.blogspot.com/feeds/posts/default`), Talos (`blog.talosintelligence.com/rss/`), Palo Alto Unit 42 (`unit42.paloaltonetworks.com/feed/`), Mandiant (`www.mandiant.com/resources/blog/rss.xml`), Microsoft Security (`www.microsoft.com/en-us/security/blog/feed/`), SentinelOne (`www.sentinelone.com/feed/`), CrowdStrike (`www.crowdstrike.com/blog/feed/`), ESET (`welivesecurity.com/feed/`), Trend Micro (`blog.trendmicro.com/feed/`), Sophos News (`news.sophos.com/en-us/feed/`), Rapid7 (`www.rapid7.com/blog/feed/`), Check Point (`research.checkpoint.com/feed/`), Huntress (`www.huntress.com/blog/rss.xml`), GreyNoise (`www.greynoise.io/blog/rss.xml`), Trail of Bits (`blog.trailofbits.com/feed/`), Tenable (`www.tenable.com/blog/feed`), Qualys (`blog.qualys.com/feed/`).

**Individual / Substack:**
Schneier on Security (`www.schneier.com/feed/`), Troy Hunt (`www.troyhunt.com/rss/`), Daniel Miessler (`danielmiessler.com/feed/`), Krebs (already above), Graham Cluley (`grahamcluley.com/feed/`), SwiftOnSecurity (Twitter-only — skip), Jupyter / Portswigger (`portswigger.net/research/rss`), r/netsec (`www.reddit.com/r/netsec.rss` — exempt from keyword routing), r/cybersecurity (`www.reddit.com/r/cybersecurity.rss`).

**Government / org:**
CISA (`www.cisa.gov/cybersecurity-advisories/all.xml`), NIST NVD (`nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml`), MSRC (`msrc.microsoft.com/update/rss/`), CERT-EU (`cert.europa.eu/publications/security-advisories/rss`), NCSC UK (`www.ncsc.gov.uk/api/1/services/v1/report-rss/feed.xml`).

**Tools / GitHub release feeds (for SECURITY TOOLS section):**
`trickest/repo`, `projectdiscovery/nuclei`, `yosisef/most*/,JMulti`, `ffuf/ffuf`, `OJ/gobuster`, `assetnote/smith`, `Nixawk/lang`, `projectdiscovery/httpx`, `projectdiscovery/subfinder`, `BeastX01/in` — pick 8-12 active recon/pentest tools the user actually cares about. Format: `https://github.com/<owner>/<repo>/releases.atom`.

### Suggested KEYWORDS for multi-category routing

Article gets routed to home category PLUS any category whose keyword matches title+summary. Examples for cybersecurity:

```ts
{ match: ["ransomware", "lockbit", "blackcat", "akira", "encrypt"], routeTo: "breaking_threats" },
{ match: ["cve-", "0day", "zero-day", "rce ", "patch tuesday", "critical flaw"], routeTo: "vulnerabilities" },
{ match: ["apt", "threat actor", "campaign", "attributed to", "chinese", "russian", "iranian"], routeTo: "threat_intelligence" },
{ match: ["data breach", "leaked", "exposed database", "personal information of"], routeTo: "data_breaches" },
{ match: ["phishing", "b ec ", "business email compromise", "scam"], routeTo: "phishing_fraud" },
{ match: ["aws ", "s3 bucket", "iam ", "azure ", "misconfig", "kubernetes"], routeTo: "cloud_security" },
{ match: ["edr", "xdr", "siem", "detection rule", "yara", "sigma rule"], routeTo: "network_endpoint" },
{ match: ["okta", "entra", "saml", "mfa ", "identity", "oauth"], routeTo: "identity_access" },
{ match: ["prompt injection", "llm attack", "ai red team", "model security"], routeTo: "ai_security" },
{ match: ["scada", "ot security", "ics ", "critical infrastructure", "plc "], routeTo: "ics_ot" },
{ match: ["cisa ", "eu ai act", "sec disclosure", "nis2", "regulation", "executive order"], routeTo: "policy_regulation" },
{ match: ["raises $", "raised $", "series a", "ipo", "acquired"], routeTo: "vendor_product" },
```

## Build sequence (follow this order — each step should type-check before moving on)

1. Scaffold `package.json` (Vite 6, React 19, TS 5.8, @tailwindcss/vite 4.1, fast-xml-parser, tsx, @types/node), `tsconfig.json`, `vite.config.ts` with `base: "/<repo-name>/"`, `index.html` with preloads, `src/main.tsx`, `src/styles.css`, `src/vite-env.d.ts`, `.gitignore` (include `node_modules dist *.tsbuildinfo`).
2. Write `scripts/sources.ts` with the categories, feeds, keywords. This is the file the user edits later — make it self-documenting with comments.
3. Write `scripts/types.ts` (shared with `src/lib/types.ts`) — `Article`, `GroupedArticle`, `TrendingStory`, `CategoryBucket` (with `articles` + `articlesAll` + `sourceCount`), `HeadlinesPayload`.
4. Write `scripts/lib/timeAgo.ts` (9 patterns) and `scripts/lib/groupStories.ts` (Jaccard ≥0.4).
5. Write `scripts/fetch-feeds.ts` — parallel fetch with timeouts, entity decoding, release-noise filter, 15-item per-feed cap, raised entity expansion limit.
6. Write `scripts/scrape-sources.ts` — generic HTML scraper config (start with 1-2 vendor blogs that need it).
7. Write `scripts/lib/router.ts` — global per-source cap (6) BEFORE routing, keyword multi-routing, per-category diversity cap, trending computation via cross-category Jaccard.
8. Write `scripts/build-data.ts` — orchestrator. Fetch RSS + scrape in parallel, route, write minified JSON. Graceful degradation: if 0 articles, keep previous JSON, exit 0.
9. Write `.github/workflows/refresh.yml` — hourly cron `5 * * * *`, also runs on push and workflow_dispatch. Steps: checkout, setup-node 20, npm ci, `npm run build:data`, commit-if-changed (with `[skip ci]` if you want to avoid loops — actually GitHub Actions commits don't trigger the workflow anyway), build, upload-pages-artifact, deploy-pages. Permissions: `contents: write, pages: write, id-token: write`. Add `concurrency: { group: refresh-deploy, cancel-in-progress: true }`.
10. Write the client: `useLocalStorageSet` (generic), `useHeadlines` (SWR with sessionStorage), `useTheme`.
11. Write components in this order: Header, StockTicker, DailyBrief, Trending, LeadStory, Headline, HoverCard, CategoryColumn, ManageMutes. Each should be self-contained and type-safe.
12. Wire `App.tsx` — 3 views (home/bookmarks/queue), muted filters apply across all views, manage-mutes modal.
13. Write `README.md` with setup, deploy instructions, and "how to add a feed".

## Quality bar (do not ship until these all pass)

- `npx tsc --noEmit` exits 0.
- `npm run build` produces a `dist/` under 250KB gzipped (excluding the JSON, which is fetched separately).
- `npm run build:data` produces `headlines.json` with **zero** HTML entities in any title.
- Every section in the output has **at least 2 distinct sources** (test by inspecting the JSON). If a section has only 1, either add more feeds or remove the section.
- Every section respects the per-source cap of 6 (inspect the JSON — count unique article IDs per source across all categories).
- Mobile breakpoint (`<768px`): sections collapse into tap-to-expand accordions. Test by loading at narrow viewport.
- The hourly cron workflow runs end-to-end in GitHub Actions and the site appears at `https://<user>.github.io/<repo>/`.

## Critical failure modes to avoid (all learned the hard way)

1. **Live RSS in the request path** — never. Build-time only.
2. **`fast-xml-parser` default entity limit (1000)** — silently drops GitHub release feeds, Reddit, large Atom feeds. Raise it (config shown above).
3. **No per-source global cap** — one high-volume source floods every category via keyword routing. Cap = 6.
4. **Reddit/HN keyword routing** — generic post titles match too broadly. Add Reddit/HN to a `KEYWORD_AGNOSTIC_SOURCES` set so they only appear in their home category.
5. **Forgetting to decode HTML entities** — feeds leak `&#8217;` and it looks broken on the live site.
6. **Complex JSX ternaries for refresh state** — there is no refresh state. Don't reintroduce it.
7. **Committing `tsconfig.tsbuildinfo** or `dist/`** — gitignore them.
8. **GitHub Actions cron committing JSON back to main** — when you `git pull --rebase` next, you'll hit conflicts on `public/data/*.json`. Resolve by `git checkout --ours public/data/ && git add public/data/ && GIT_EDITOR=true git rebase --continue`. The workflow is doing the right thing; you just have to handle the merge.
9. **Don't push to deploy then immediately push again** — the cron may have committed and your push will be rejected. Always `git pull --rebase` first.

## Deploy instructions for the user (the agent should output these in the final summary)

1. Push the repo to GitHub (name it `cyber-drudge` or whatever — update `base` in `vite.config.ts` to match).
2. Repo Settings → Pages → Source: **GitHub Actions**.
3. First push triggers the workflow; site appears at `https://<username>.github.io/<repo>/` within ~3 minutes.
4. Optional: add `ANTHROPIC_API_KEY` as a repo Actions secret to enable the LLM daily brief.
5. To add/remove feeds later: edit `scripts/sources.ts` only. Nothing else needs to change.

## How to add a feed (the agent should document this in the README)

Edit `scripts/sources.ts`, find the right category, append:
```ts
{ name: "My Source", url: "https://example.com/feed.xml", category: "threat_intelligence", priority: "high" },
```
That's it. The hourly cron picks it up automatically.

## Tone

Build it like a senior engineer who has shipped this exact thing before. Minimal comments that explain *why*, not *what*. No emojis in code or UI. Tight, dense, professional. The site should feel like Drudge Report cosplayed as a SOC dashboard.

---

Begin by scaffolding the project and the source list, then proceed through the build sequence. Do not stop until the production build passes and the README is written.
