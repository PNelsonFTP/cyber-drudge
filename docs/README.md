# CYBER DRUDGE — Documentation Index

This folder contains the full technical documentation for the Cyber Drudge project: a Drudge-Report-style cybersecurity news aggregator deployed at [https://pnelsonftp.github.io/cyber-drudge/](https://pnelsonftp.github.io/cyber-drudge/).

| Document | Purpose |
| -------- | ------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flow, ranking algorithm, UI architecture |
| [SBOM.md](./SBOM.md) | Software Bill of Materials (direct + transitive dependencies) |
| [HANDOFF.md](./HANDOFF.md) | Operations handoff: deploy, maintain, troubleshoot, extend |
| [UPGRADE-PLAN.md](./UPGRADE-PLAN.md) | **Build-ready** implementation plan: freshness ranking, importance/KEV scoring, source-quality overhaul |
| [FUTURE-IMPROVEMENTS.md](./FUTURE-IMPROVEMENTS.md) | Prioritized backlog for the next upgrade cycle |
| [CHANGELOG.md](./CHANGELOG.md) | Build history and notable changes since initial release |

## Quick reference

| Item | Value |
| ---- | ----- |
| **Live URL** | https://pnelsonftp.github.io/cyber-drudge/ |
| **GitHub repo** | https://github.com/PNelsonFTP/cyber-drudge |
| **Owner** | PNelsonFTP |
| **Primary config file** | `scripts/sources.ts` (feeds, categories, keywords) |
| **Data refresh** | Hourly cron (`5 * * * *`) via GitHub Actions |
| **Runtime** | Static SPA — no server, no database, no live RSS in browser |

## The one architectural rule

**Never scrape RSS in the deployed app.** All feed fetching happens at build time in `scripts/build-data.ts`. The browser loads three static JSON files only.
