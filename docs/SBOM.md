# Software Bill of Materials (SBOM)

**Project:** cyber-drudge  
**Version:** 1.0.0  
**Generated:** 2026-06-18  
**Format:** SPDX-style inventory (direct dependencies + key transitive)  
**Live site:** https://pnelsonftp.github.io/cyber-drudge/

---

## 1. Application summary

| Field | Value |
| ----- | ----- |
| Name | cyber-drudge |
| Description | Build-time aggregated cybersecurity news SPA (Drudge-style) |
| License | Private (no `license` field in package.json) |
| Language | TypeScript 5.9 |
| Runtime (deployed) | Static HTML/CSS/JS on GitHub Pages |
| Runtime (build) | Node.js 20 (GitHub Actions) |
| Bundle size (gzipped, excl. JSON) | ~72 KB (JS 67 KB + CSS 4 KB + HTML 0.5 KB) |

---

## 2. Direct dependencies (production)

These ship in the build pipeline and/or are required at `npm run build:data`.

| Package | Resolved version | Purpose | In browser bundle? |
| ------- | ---------------- | ------- | ------------------ |
| [react](https://www.npmjs.com/package/react) | 19.2.7 | UI framework | Yes |
| [react-dom](https://www.npmjs.com/package/react-dom) | 19.2.7 | React DOM renderer | Yes |
| [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser) | 4.5.6 | RSS/Atom parsing | **No** — build-time only (`scripts/`) |

---

## 3. Direct dependencies (development)

| Package | Resolved version | Purpose |
| ------- | ---------------- | ------- |
| [vite](https://www.npmjs.com/package/vite) | 6.4.3 | Bundler and dev server |
| [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) | 4.7.0 | React Fast Refresh + JSX |
| [typescript](https://www.npmjs.com/package/typescript) | 5.9.3 | Type checking |
| [tsx](https://www.npmjs.com/package/tsx) | 4.22.4 | Run TypeScript build scripts |
| [tailwindcss](https://www.npmjs.com/package/tailwindcss) | 4.3.1 | Utility CSS framework |
| [@tailwindcss/vite](https://www.npmjs.com/package/@tailwindcss/vite) | 4.3.1 | Tailwind v4 Vite plugin |
| [@types/node](https://www.npmjs.com/package/@types/node) | 22.19.21 | Node.js type definitions |
| [@types/react](https://www.npmjs.com/package/@types/react) | 19.2.17 | React type definitions |
| [@types/react-dom](https://www.npmjs.com/package/@types/react-dom) | 19.2.3 | React DOM type definitions |

---

## 4. Key transitive dependencies

| Package | Version | Parent | Notes |
| ------- | ------- | ------ | ----- |
| @babel/core | 7.29.7 | @vitejs/plugin-react | JSX transform |
| @tailwindcss/node | 4.3.1 | @tailwindcss/vite | Tailwind compiler |
| @tailwindcss/oxide | 4.3.1 | tailwindcss | Native CSS engine |
| lightningcss | 1.32.0 | @tailwindcss/node | CSS minification |
| esbuild | (via vite) | vite | Bundling |
| rollup | (via vite) | vite | Bundling |
| strnum | (via fast-xml-parser) | fast-xml-parser | Numeric parsing |

Full transitive tree: run `npm ls --all` in the repo root.

---

## 5. CI/CD and infrastructure (not npm)

| Component | Version / ID | Role |
| --------- | ------------ | ---- |
| GitHub Actions | `ubuntu-latest` | Build and deploy runner |
| actions/checkout | v4 | Source checkout |
| actions/setup-node | v4 | Node 20 + npm cache |
| actions/configure-pages | v5 | GitHub Pages setup |
| actions/upload-pages-artifact | v3 | Deploy artifact upload |
| actions/deploy-pages | v4 | GitHub Pages deploy |
| GitHub Pages | — | Static hosting |
| Node.js (CI) | 20.x | Build and data scripts |

---

## 6. External services (runtime, no SDK)

| Service | Used by | Auth | Purpose |
| ------- | ------- | ---- | ------- |
| ~51 RSS/Atom feeds | `fetch-feeds.ts` | None | Headline sources |
| CrowdStrike blog (HTML) | `scrape-sources.ts` | None | Scrape fallback |
| Yahoo Finance Chart API | `fetch-stocks.ts` | None (User-Agent) | Stock quotes |
| Anthropic Messages API | `generate-brief.ts` | `ANTHROPIC_API_KEY` secret (optional) | LLM daily brief |

**Removed:** Stooq CSV API — endpoint began returning 404 HTML for US tickers; replaced by Yahoo-only fetch (2026-06-18).

---

## 7. Generated artifacts (not in npm)

| Artifact | Path | Approx. size | Refresh |
| -------- | ---- | ------------- | ------- |
| Headlines payload | `public/data/headlines.json` | ~250–350 KB | Hourly |
| Stock quotes | `public/data/stocks.json` | ~0.5 KB | Hourly |
| Daily brief | `public/data/brief.json` | ~0.5 KB | Hourly |
| Production build | `dist/` | ~568 KB uncompressed | Per deploy |

---

## 8. Security and supply-chain notes

- **No secrets in repo.** Optional `ANTHROPIC_API_KEY` is a GitHub Actions secret only.
- **`fast-xml-parser`** entity expansion limits are raised in `fetch-feeds.ts` (100,000) to avoid silent truncation of large Atom feeds; this is a deliberate trade-off for feed completeness.
- **Client bundle** does not include `fast-xml-parser`, `tsx`, or any fetch/scrape logic.
- **Dependabot:** not configured; recommend enabling for npm + GitHub Actions in a future cycle.
- **SBOM regeneration:** `npm ci && npm ls --depth=0` after any `package.json` change.

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

Verify current licenses with `npm view <package> license` before redistribution.
