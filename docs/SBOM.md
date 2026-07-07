# Software Bill of Materials (SBOM)

**Project:** cyber-drudge
**Version:** 1.2.0
**Generated:** 2026-07-07
**Format:** SPDX-style inventory
**Live site:** https://pnelsonftp.github.io/cyber-drudge/

Regenerate after dependency changes: `npm ci && npm ls --depth=0 && npm audit`

---

## 1. Application summary

| Field | Value |
| ----- | ----- |
| Name | cyber-drudge |
| Description | Build-time aggregated cybersecurity news SPA (Drudge-style) |
| License | Private (no `license` field in package.json) |
| Language | TypeScript 5.9 |
| Runtime (deployed) | Static HTML/CSS/JS on GitHub Pages |
| Runtime (build) | Node.js 24 (GitHub Actions), Node 22+ locally |
| Bundle size (gzipped, excl. JSON) | ~73 KB (JS ~68 KB + CSS ~5 KB + HTML ~0.7 KB) |
| Feed sources | 91 RSS/Atom + 1 HTML scrape (92 total) |
| Categories | 18 |
| `npm audit` status | **0 vulnerabilities** (as of 2026-07-07) |

---

## 2. Direct dependencies — production

Used by the build pipeline; **not** all bundled into the browser.

| Package | Resolved | Purpose | In browser bundle? |
| ------- | -------- | ------- | ------------------ |
| [react](https://www.npmjs.com/package/react) | 19.2.7 | UI framework | Yes |
| [react-dom](https://www.npmjs.com/package/react-dom) | 19.2.7 | React DOM renderer | Yes |
| [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) | 5.9.3 | RSS/Atom parsing | **No** — build-time only |

> `fast-xml-parser` was upgraded 4.5.6 → 5.9.3 in v1.2.0 to clear
> [GHSA-gh4j-gqv2-49f6](https://github.com/advisories/GHSA-gh4j-gqv2-49f6)
> (moderate; XMLBuilder comment/CDATA injection). The vulnerable API
> (XMLBuilder) was never used here — only XMLParser — but the upgrade keeps
> `npm audit` clean.

---

## 3. Direct dependencies — development

| Package | Resolved | Purpose |
| ------- | -------- | ------- |
| [vite](https://www.npmjs.com/package/vite) | 6.4.3 | Bundler and dev server |
| [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) | 4.7.0 | React Fast Refresh + JSX |
| [typescript](https://www.npmjs.com/package/typescript) | 5.9.3 | Type checking |
| [tsx](https://www.npmjs.com/package/tsx) | 4.22.4 | Run TypeScript build scripts |
| [tailwindcss](https://www.npmjs.com/package/tailwindcss) | 4.3.1 | Utility CSS framework |
| [@tailwindcss/vite](https://www.npmjs.com/package/@tailwindcss/vite) | 4.3.1 | Tailwind v4 Vite plugin |
| [@types/node](https://www.npmjs.com/package/@types/node) | 22.19.21 | Node.js type definitions |
| [@types/react](https://www.npmjs.com/package/@types/react) | 19.2.17 | React type definitions |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom) | 19.2.3 | React DOM type definitions |

**Total direct packages:** 12
**Total locked packages (package-lock.json):** 190

Known-available majors deliberately deferred to the next tooling pass (see
FUTURE-IMPROVEMENTS #12): vite 8, typescript 6, @vitejs/plugin-react 6.

---

## 4. Key transitive dependencies

| Package | Parent | Notes |
| ------- | ------ | ----- |
| @babel/core | @vitejs/plugin-react | JSX transform |
| @tailwindcss/node, @tailwindcss/oxide | @tailwindcss/vite | Tailwind compiler + native CSS engine |
| lightningcss | @tailwindcss/node | CSS minification |
| esbuild, rollup | vite | Bundling |
| strnum | fast-xml-parser | Numeric parsing |
| @jridgewell/* | Babel / Tailwind | Source maps |

Full tree: `npm ls --all > sbom-tree.txt`

---

## 5. CI/CD and infrastructure (not npm)

All actions are **pinned to commit SHAs** (v1.2.0) — the workflow holds
`contents: write` and a secret, so mutable tags are a supply-chain risk.
Dependabot keeps the pins current.

| Component | Pin (tag) | Role |
| --------- | --------- | ---- |
| actions/checkout | `34e11487…` (v4) | Source checkout |
| actions/setup-node | `49933ea5…` (v4) | Node 24 + npm cache |
| actions/configure-pages | `983d7736…` (v5) | GitHub Pages setup |
| actions/upload-pages-artifact | `56afc609…` (v3) | Deploy artifact upload |
| actions/deploy-pages | `d6db9016…` (v4) | GitHub Pages deploy |
| GitHub Actions runner | `ubuntu-latest` | Build and deploy (15-min job timeout) |
| GitHub Pages | — | Static hosting (`github-pages` environment) |
| Dependabot | weekly | npm (grouped dev minors/patches) + github-actions |

**CI steps:** Install → Typecheck → Build data → Data health check (warn-only) → Commit JSON (rebase-first) → Build site → Deploy Pages

---

## 6. External services (runtime, no SDK)

| Service | Module | Auth | Purpose |
| ------- | ------ | ---- | ------- |
| 91 RSS/Atom feeds | `fetch-feeds.ts` | None (1 feed sends a static cookie header) | Headline sources |
| CrowdStrike blog (HTML) | `scrape-sources.ts` | None | Scrape fallback |
| CISA KEV JSON | `fetch-kev.ts` | None | Known Exploited Vulnerabilities catalog (scoring source of truth) |
| kevin.gtfkd.com | via `sources.ts` | None | Third-party KEV→RSS bridge (headline surfacing only; fails soft) |
| Yahoo Finance Chart API | `fetch-stocks.ts` | User-Agent only | Stock quotes (8 tickers) |
| Anthropic Messages API | `generate-brief.ts` | `ANTHROPIC_API_KEY` (optional) | LLM daily brief (`claude-haiku-4-5-20251001`); curated fallback without key |

**Removed in v1.2:** reddit.com feeds (403/429 from Actions IPs — replaced by
lobste.rs and hnrss.org); SNET and CYBR tickers (nonexistent / delisted).

---

## 7. Generated artifacts

| Artifact | Path | Approx. size | Refresh |
| -------- | ---- | ------------- | ------- |
| Headlines payload | `public/data/headlines.json` | ~280 KB | Hourly |
| Stock quotes | `public/data/stocks.json` | ~0.8 KB | Hourly |
| Daily brief | `public/data/brief.json` | ~0.5 KB | Hourly |
| Production build | `dist/` | ~570 KB uncompressed | Per deploy |

---

## 8. Security and supply-chain notes

- **No secrets in repo.** `ANTHROPIC_API_KEY` is a GitHub Actions secret only.
- **`npm audit`: 0 vulnerabilities** after the fast-xml-parser v5 upgrade.
- **Client bundle** excludes `fast-xml-parser`, `tsx`, and all fetch/scrape logic.
- **Link hygiene (v1.2):** feed-controlled URLs must be `http(s)` at ingest, with a second guard at render — no `javascript:` scheme can reach an `href`.
- **Parser hardening (v1.1):** rejects non-XML bodies before parse (HTML interstitials).
- **Actions pinned by SHA; Dependabot enabled** (both v1.2).
- **Third-party dependency of note:** kevin.gtfkd.com (hobby KEV bridge) is surfacing-only; scoring uses CISA's JSON directly. See FUTURE-IMPROVEMENTS deferred decisions.
- **SBOM refresh:** after any `package.json` change, run `npm ci && npm audit` and update this file.

---

## 9. License summary (third-party)

| Package | Typical license |
| ------- | --------------- |
| React / React DOM | MIT |
| Vite | MIT |
| TypeScript | Apache-2.0 |
| Tailwind CSS | MIT |
| fast-xml-parser | MIT |
| tsx | MIT |

Verify: `npm view <package> license`
