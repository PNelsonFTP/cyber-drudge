# Migration & Portability Guide

**Project:** Cyber Drudge  
**Version:** 1.1.0  
**Last updated:** 2026-06-22  
**Audience:** Moving the repo to a new computer, new local directory, renamed GitHub repo, or custom domain

---

## 1. Executive summary

Cyber Drudge has **no hard-coded absolute filesystem paths** (no `/Users/...` or `C:\...` in source). Build scripts resolve paths relative to their own file location via `import.meta.url`. The project is portable by design.

What **will** break if you change deployment context without updating config:

| Change | Code changes required? |
| ------ | ---------------------- |
| Clone to a different folder on disk | **No** |
| Move to a new computer | **No** (reinstall Node, `npm ci`) |
| Rename GitHub repo | **Yes** — update `base` in `vite.config.ts` (1 file, since v1.2) |
| Change GitHub username/org | **Yes** — update `base` + GitHub Pages URL |
| Deploy to root of custom domain | **Yes** — set `base: "/"` in `vite.config.ts` |
| Fork under a new remote | **Maybe** — only if repo name changes |

---

## 2. What is NOT tied to directory structure

These use **relative** resolution and work anywhere the repo is cloned:

| Location | Mechanism |
| -------- | --------- |
| `scripts/build-data.ts` | `path.resolve(__dirname, "..", "public", "data")` |
| `scripts/check-data.ts` | Same pattern → `public/data/headlines.json` |
| `scripts/fetch-feeds.ts`, `fetch-kev.ts`, etc. | No filesystem paths; network only |
| `src/` imports | Standard ESM relative imports |
| `tsconfig.json` `"include"` | Relative globs: `src`, `scripts`, `vite.config.ts` |
| GitHub Actions workflow | Uses `./dist`, `./public/data/*.json` (repo-root relative) |

**Verify:** There are zero references to `/Users/paulnelson` or any other machine-specific path in tracked source.

---

## 3. Hard-coded values that depend on repo / deploy name

These embed the string **`cyber-drudge`** (the GitHub repo name). They must stay in sync if you rename the repo or change Pages URL structure.

### 3.1 Required changes when renaming the repo

Since v1.2, `index.html` uses Vite's `%BASE_URL%` placeholder — **only one file** embeds the repo name:

| File | Lines / fields | Current value | Purpose |
| ---- | -------------- | ------------- | ------- |
| `vite.config.ts` | `base` | `"/cyber-drudge/"` | Asset URLs, `import.meta.env.BASE_URL`, `%BASE_URL%` in index.html |

**Does NOT need changing** (derives from Vite `base` automatically):

| File | Mechanism |
| ---- | --------- |
| `index.html` | `%BASE_URL%` placeholder replaced by Vite at build/dev time |
| `src/hooks/useHeadlines.ts` | `import.meta.env.BASE_URL` → fetches `data/headlines.json` etc. |
| Vite-built JS/CSS in `dist/` | Hashed paths prefixed with `base` at build time |

### 3.2 Custom domain at root (e.g. `https://news.example.com/`)

Set in `vite.config.ts`:

```ts
base: "/",
```

Nothing else — `index.html` follows `base` automatically. Configure the custom domain in GitHub Pages settings (repo → Settings → Pages).

### 3.3 GitHub Pages URL formula

```
https://<github-username>.github.io/<repo-name>/
```

Current production:

```
https://pnelsonftp.github.io/cyber-drudge/
```

The `<repo-name>` segment **must match** `vite.config.ts` `base` (without trailing ambiguity: base includes trailing slash).

---

## 4. Application identifiers (not filesystem paths)

These use the prefix `cyber-drudge:` in **browser storage**. They do not affect builds or directory layout, but users lose saved state if you change them:

| Key | File | Stored data |
| --- | ---- | ----------- |
| `cyber-drudge:theme` | `src/hooks/useTheme.ts` | dark / light / system |
| `cyber-drudge:bookmarks` | `src/App.tsx` | Bookmarked article IDs |
| `cyber-drudge:queue` | `src/App.tsx` | Read-later queue |
| `cyber-drudge:muted:sources` | `src/App.tsx` | Muted outlet names |
| `cyber-drudge:muted:categories` | `src/App.tsx` | Muted section IDs |
| `cyber-drudge:cache:headlines` | `src/hooks/useHeadlines.ts` | sessionStorage SWR cache |
| `cyber-drudge:cache:stocks` | `src/hooks/useHeadlines.ts` | sessionStorage |
| `cyber-drudge:cache:brief` | `src/hooks/useHeadlines.ts` | sessionStorage |

**When to change:** Only if running two Drudge-style sites on the same origin and you need isolated user prefs. Changing keys resets all user bookmarks/mutes/theme on next visit.

**npm package name:** `"name": "cyber-drudge"` in `package.json` — cosmetic for local dev; does not affect deploy.

---

## 5. External / cloud configuration (not in repo)

| Item | Where it lives | Required? |
| ---- | -------------- | --------- |
| GitHub repo | `github.com/PNelsonFTP/cyber-drudge` | Yes |
| GitHub Pages source | Settings → Pages → **GitHub Actions** | Yes |
| `ANTHROPIC_API_KEY` | Repo → Settings → Secrets → Actions | Optional (LLM brief) |
| `GITHUB_TOKEN` | Auto-provided by Actions | Auto |

No `.env` file is committed or required locally.

---

## 6. New computer setup checklist

### Prerequisites

- **Node.js 22+** (CI uses 24; anything 22+ works locally)
- **npm** (ships with Node)
- **git**
- Network access to npm registry and RSS/feed endpoints (for `npm run build:data`)

### Steps

```bash
# 1. Clone (any directory you prefer)
git clone https://github.com/PNelsonFTP/cyber-drudge.git
cd cyber-drudge   # or whatever you named the folder locally

# 2. Install exact locked dependencies
npm ci

# 3. Verify toolchain
npm run typecheck
npm run build

# 4. Optional: refresh feed data locally (requires network)
npm run build:data
npm run build:check

# 5. Local dev — note the /cyber-drudge/ path
npm run dev
# Open http://localhost:5173/cyber-drudge/
```

### What transfers automatically via git

- All source, config, workflows, committed `public/data/*.json`
- `package-lock.json` (exact dependency tree)

### What does NOT transfer via git

- `node_modules/` — regenerate with `npm ci`
- `dist/` — regenerate with `npm run build`
- Browser localStorage / sessionStorage (bookmarks, theme, mutes)
- GitHub Secrets (`ANTHROPIC_API_KEY`) — re-create on new repo if forking
- GitHub Pages enablement — re-enable on fork

---

## 7. Fork or rename workflow

### Scenario A: Same code, new folder on same machine

```bash
cp -R /old/path/cyber-drudge /new/path/cyber-drudge
cd /new/path/cyber-drudge
rm -rf node_modules dist
npm ci
```

No source edits required.

### Scenario B: New GitHub repo with different name

1. Create repo `my-new-name` on GitHub.
2. Push code: `git remote set-url origin git@github.com:YOU/my-new-name.git && git push -u origin main`
3. Edit `vite.config.ts`: `base: "/my-new-name/"` (the only file that embeds the repo name)
4. Enable GitHub Pages → Source: **GitHub Actions**
5. Push; wait for workflow to deploy.
6. Verify: `https://YOU.github.io/my-new-name/`

### Scenario C: Fork under your account, keep name `cyber-drudge`

1. Fork on GitHub.
2. `git clone` your fork.
3. Enable Pages → GitHub Actions on **your** fork.
4. Optionally add `ANTHROPIC_API_KEY` secret.
5. No code changes if repo name stays `cyber-drudge`.

---

## 8. CI/CD portability

Workflow: `.github/workflows/refresh.yml`

| Setting | Value | Portable? |
| ------- | ----- | --------- |
| `runs-on` | `ubuntu-latest` | Yes |
| `node-version` | `"24"` | Yes |
| `path: ./dist` | Repo-relative | Yes |
| Cron | `5 * * * *` | Yes (UTC) |
| Branch trigger | `main` | Yes — rename branch if needed |

No secrets paths or absolute directories in the workflow.

---

## 9. Common breakage symptoms

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Blank page, 404 on JS/CSS | `base` mismatch vs URL path | Align `vite.config.ts` `base` with `/repo-name/` |
| Favicon missing | Stale build after `base` change | Rebuild — `%BASE_URL%` is substituted at build time |
| JSON fetch fails (empty site) | Wrong BASE_URL | Rebuild after fixing `base`; hard-refresh browser |
| `npm run dev` works at `/` but not `/cyber-drudge/` | Opening wrong URL | Use `http://localhost:5173/cyber-drudge/` |
| `build:data` hangs locally | Sandbox/firewall blocking RSS | Run on GitHub Actions or unrestricted network |
| Git push rejected | Cron committed JSON while you worked | `git pull --rebase origin main` |
| Bookmarks gone | New browser / cleared storage | Expected — keys are per-browser |

---

## 10. Post-migration verification

Run in order after any move or rename:

```bash
npm ci
npm run typecheck          # expect exit 0
npm run build              # expect dist/ created
npm run build:check        # expect PASS (uses committed JSON)
```

If you ran `build:data`:

```bash
npm run build:check        # review feed health warnings
npm run preview            # spot-check http://localhost:4173/cyber-drudge/
```

On GitHub: Actions → latest **Refresh and Deploy** → all steps green.

Live smoke test:

- [ ] Site loads at expected URL
- [ ] Masthead shows "updated Xm ago"
- [ ] Three columns render with headlines
- [ ] Theme toggle works
- [ ] Stock ticker shows quotes

---

## 11. Quick reference: files to edit when context changes

| Goal | Files to edit |
| ---- | ------------- |
| Rename GitHub repo | `vite.config.ts` only |
| Custom domain at `/` | `vite.config.ts`, GitHub Pages DNS |
| Change localStorage namespace | `src/hooks/useTheme.ts`, `src/hooks/useHeadlines.ts`, `src/App.tsx`, theme snippet in `index.html` |
| Change feed list | `scripts/sources.ts` only |
| Change ranking tuning | `scripts/lib/score.ts`, category windows in `scripts/sources.ts` |
| Change deploy schedule | `.github/workflows/refresh.yml` cron |
| Change Node version in CI | `.github/workflows/refresh.yml` `node-version` |
