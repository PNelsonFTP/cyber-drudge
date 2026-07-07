# CYBER DRUDGE — Documentation Index

This folder contains the full technical documentation for the Cyber Drudge project: a Drudge-Report-style cybersecurity news aggregator deployed at [https://pnelsonftp.github.io/cyber-drudge/](https://pnelsonftp.github.io/cyber-drudge/).

**Current version:** 1.2.0 (2026-07-07)

| Document | Purpose |
| -------- | ------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flow, scoring (v1.1), deployment |
| [SBOM.md](./SBOM.md) | Software Bill of Materials (direct + transitive dependencies) |
| [MIGRATION.md](./MIGRATION.md) | **Moving to a new computer, directory, renamed repo, or custom domain** |
| [HANDOFF.md](./HANDOFF.md) | Operations handoff: deploy, maintain, troubleshoot, extend |
| [UPGRADE-PLAN.md](./UPGRADE-PLAN.md) | Completed v1.1 implementation plan (reference) |
| [FUTURE-IMPROVEMENTS.md](./FUTURE-IMPROVEMENTS.md) | Prioritized backlog for the next upgrade cycle (12+ items) |
| [CHANGELOG.md](./CHANGELOG.md) | Release history (1.0.0 → 1.2.0) |

## Quick reference

| Item | Value |
| ---- | ----- |
| **Live URL** | https://pnelsonftp.github.io/cyber-drudge/ |
| **GitHub repo** | https://github.com/PNelsonFTP/cyber-drudge |
| **Primary config** | `scripts/sources.ts` (feeds, categories, age windows, keywords) |
| **Ranking tuning** | `scripts/lib/score.ts` |
| **Data refresh** | Hourly cron (`5 * * * *`) via GitHub Actions (Node 24) |
| **Health check** | `npm run build:check` |
| **Source validation** | `npm run validate:sources` (live per-feed checks) |
| **Sources** | 91 feeds + 1 scrape + CISA KEV, 18 categories |
| **Runtime** | Static SPA — no server, no database, no live RSS in browser |

## New machine quick start

```bash
git clone https://github.com/PNelsonFTP/cyber-drudge.git
cd cyber-drudge
npm ci
npm run typecheck && npm run build
npm run dev    # → http://localhost:5173/cyber-drudge/
```

See [MIGRATION.md](./MIGRATION.md) if renaming the repo or changing deploy URL.

## The one architectural rule

**Never scrape RSS in the deployed app.** All fetching happens at build time in `scripts/build-data.ts`. The browser loads three static JSON files only.
