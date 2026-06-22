# Upgrade Plan — Freshness, Importance & Source Quality

**Project:** Cyber Drudge
**Plan version:** 1.0
**Author:** Review pass (Claude)
**Intended executor:** A follow-up coding agent ("GLM")
**Date:** 2026-06-22

This is a **build-ready implementation plan**. It is self-contained: every URL has been live-validated, every constant has a recommended value, and every task lists the exact files and acceptance criteria. Work the phases in order. After each phase, run the [verification script](#verification-script) and compare against the [baseline](#baseline-measurements).

---

## 0. Non-negotiable rules

1. **No live RSS / network in the deployed app.** All fetching happens at build time in `scripts/`. The browser only loads `public/data/*.json`. Do not add fetch calls to `src/`.
2. **`scripts/sources.ts` stays the primary edit surface.** New feeds, categories, keywords, tuning knobs belong there or in a clearly-named lib module — not scattered.
3. **Graceful degradation must survive.** Every new network call (KEV, new feeds) must fail soft: on error, return empty and keep building. Never let a data fetch fail the deploy.
4. **Keep `npx tsc --noEmit` green** and bundle size roughly flat (~67 KB gzipped JS).

---

## 1. Why this upgrade (evidence)

Measured from the live `public/data/headlines.json` (generated 2026-06-19):

### Staleness (primary complaint)
- 119 unique visible articles. **Median age 54h; p90 age 233h (~9.7 days).**
- Age distribution of visible items:

  | <6h | 6–24h | 1–3d | 3–7d | **7–14d** | >14d |
  |-----|-------|------|------|-----------|------|
  | 14  | 27    | 32   | 14   | **32 (27%)** | 0 |

  **27% of visible articles are 7–14 days old.** Root cause: a single 14-day hard cap (`MAX_AGE_HOURS` in `scripts/lib/router.ts`) plus thin categories backfilling visible slots with whatever exists, regardless of age.

### Importance is shallow
- Ranking = feed-level `priority` × time decay only. No signal for *actively exploited / KEV / zero-day / CVSS 9–10 / "millions of records"*. "Most important" is not actually modeled.

### Source health (5 broken, several thin)
- `Mandiant` parse error ("Maximum nested tags exceeded"), `Google Project Zero` empty, `SC Media` empty, `Trend Micro` empty, `HackerOne` 404, `PortSwigger Daily Swig` empty (**publication discontinued in 2024**), `r/netsec`/`r/AskNetsec` HTTP 429.
- **5 of 9 GitHub tool feeds yield 0 items** — the `isReleaseNoise` filter in `scripts/fetch-feeds.ts` strips pure version-tag titles, so `SECURITY TOOLS` is effectively dead.
- Thin categories: `data_breaches`, `cloud_security`, `ai_security`, `security_tools`.

### Trending
- Only 2 clusters, with no freshness gate (a stale cluster could lead).

---

## 2. Baseline measurements

Record these before starting so you can prove improvement:

| Metric | Baseline (2026-06-19) | Target after upgrade |
|--------|----------------------|----------------------|
| Visible median age | 54h | ≤ 30h |
| Visible p90 age | ~233h (9.7d) | ≤ ~120h (5d) |
| Share of visible 7–14d | 27% | < 5% |
| Feed ok/total | 46/51 (90%) | ≥ 95% of a **cleaned** list |
| `data_breaches` distinct sources | thin (~1–2) | ≥ 3 |
| `cloud_security` distinct sources | thin | ≥ 3 |
| `security_tools` non-empty | effectively empty | ≥ 4 items, ≥ 3 sources |
| Trending clusters | 2 | ≥ 4, all ≤ 72h |

---

## 3. Phases & tasks

### Phase 0 — Foundation: one shared scoring module

**Task 0.1 — Create `scripts/lib/score.ts`.** The scorer is currently **duplicated** in `scripts/lib/router.ts` (`articleScore`, `byScore`, `recencyMultiplier`, `priorityRank`, `clampPublishedAt`, `ageHours`) and `scripts/lib/groupStories.ts` (a second copy). Extract a single source of truth. Everything else depends on this.

```ts
// scripts/lib/score.ts
import type { Article, Priority } from "../types";

export const HALF_LIFE_HOURS = 48;          // was 72 (Phase 1)
export const TRENDING_MAX_AGE_HOURS = 72;   // Phase 1
export const LEAD_MAX_AGE_HOURS = 96;       // Phase 1

export function clampPublishedAt(t: number, now = Date.now()): number {
  return t > now ? now : t;
}
export function ageHours(t: number, now = Date.now()): number {
  return Math.max(0, (now - clampPublishedAt(t, now)) / 3_600_000);
}
export function recencyMultiplier(t: number, now = Date.now()): number {
  return Math.pow(0.5, ageHours(t, now) / HALF_LIFE_HOURS);
}
export function priorityRank(p: Priority): number {
  return p === "critical" ? 3 : p === "high" ? 2 : 1;
}

export interface Scorable {
  priority: Priority;
  publishedAt: number;
  title?: string;
  snippet?: string;
  kev?: boolean;
  related?: { length: number };
}

export function articleScore(a: Scorable, now = Date.now()): number {
  const base = priorityRank(a.priority) + importanceBoost(a);
  const rec = recencyMultiplier(a.publishedAt, now);
  const relatedBonus = 0.04 * (a.related?.length ?? 0);
  return base * rec + relatedBonus;
}

export function byScore(a: Scorable, b: Scorable, now = Date.now()): number {
  const d = articleScore(b, now) - articleScore(a, now);
  if (d !== 0) return d;
  return clampPublishedAt(b.publishedAt, now) - clampPublishedAt(a.publishedAt, now);
}

// importanceBoost defined in Phase 2 (returns 0 until then)
export function importanceBoost(_a: Scorable): number { return 0; }
```

Then **delete** the duplicated helpers in `router.ts` and `groupStories.ts` and import from `score.ts`. Keep `router.ts`'s `GLOBAL_PER_SOURCE_CAP`, `diversityCap`, and routing logic local.

**Acceptance:** `tsc` green; `npm run build:data` output is byte-similar to before (half-life still 72 at this point if you prefer to land Phase 0 in isolation — otherwise set 48 now and expect a freshness shift).

---

### Phase 1 — Freshness

**Task 1.1 — Shorten half-life 72h → 48h.** Already set in `score.ts` above (`HALF_LIFE_HOURS = 48`). Effect: a 3-day-old item now scores ~0.42 of fresh (was 0.5); a 7-day item ~0.13.

**Task 1.2 — Per-category age windows.** Add optional fields to `CategoryDef` in `scripts/sources.ts`:

```ts
export interface CategoryDef {
  id: CategoryId;
  label: string;
  column?: "left" | "center" | "right";
  /** Items older than this are dropped from this category (hours). */
  maxAgeHours?: number;
  /** Preferred freshness window; older items only backfill if needed (hours). */
  softAgeHours?: number;
}
```

Recommended values (apply in the `CATEGORIES` array):

| Category | softAgeHours | maxAgeHours |
|----------|--------------|-------------|
| breaking_threats, incident_response, phishing_fraud | 48 | 120 (5d) |
| vulnerabilities, malware_analysis, threat_intelligence, data_breaches, cloud_security, network_endpoint, identity_access, ai_security, ics_ot, offense_red_team | 96 | 240 (10d) |
| policy_regulation, vendor_product, bug_bounty_research, security_tools, crypto_pqc | 168 | 336 (14d) |

Add defaults in `router.ts` for any category missing them: `softAgeHours = 96`, `maxAgeHours = 240`. **Remove the global `MAX_AGE_HOURS` filter** in `routeAll` and instead filter per-category by that category's `maxAgeHours` after routing.

**Task 1.3 — Starvation-aware visible fill.** In `routeAll`, when building each category's `visible` list, replace the single sort+diversity-cap with a fresh-first, backfill-if-needed approach:

```ts
const MIN_VISIBLE = 4;
// groupedAll already sorted by byScore and within maxAgeHours
const fresh = groupedAll.filter((g) => ageHours(g.publishedAt) <= softAge);
const stale = groupedAll.filter((g) => ageHours(g.publishedAt) > softAge);

const pick = (pool: GroupedArticle[], counts: Map<string, number>, out: GroupedArticle[]) => {
  for (const g of pool) {
    const c = counts.get(g.source) ?? 0;
    if (c >= cap) continue;
    counts.set(g.source, c + 1);
    out.push(g);
  }
};
const counts = new Map<string, number>();
const visible: GroupedArticle[] = [];
pick(fresh, counts, visible);
if (visible.length < MIN_VISIBLE) pick(stale, counts, visible); // only backfill when starved
```

Keep `articlesAll = groupedAll` (within `maxAgeHours`) for the "view all" expansion.

**Task 1.4 — Freshness gate on Trending & Lead.**
- In `computeTrending`, cluster only from articles with `ageHours(a.publishedAt) <= TRENDING_MAX_AGE_HOURS`.
- For the lead story, prefer the highest-scoring grouped article with `ageHours <= LEAD_MAX_AGE_HOURS`; if none qualify (rare), fall back to the overall top.

**Acceptance (Phase 1):** Re-run verification script. Median age ≤ 30h, p90 ≤ ~120h, 7–14d share < 5%, trending items all ≤ 72h.

---

### Phase 2 — Importance signals

**Task 2.1 — Implement `importanceBoost` in `score.ts`.** Replace the stub. Boosts are additive to the base tier, capped, then multiplied by recency (so they cannot resurrect old items):

```ts
const SIGNALS: Array<{ re: RegExp; boost: number }> = [
  { re: /actively exploited|exploited in the wild|in-the-wild/i, boost: 1.5 },
  { re: /\bKEV\b|known exploited/i,                               boost: 1.5 },
  { re: /zero[- ]day|0day|0-day/i,                                boost: 1.2 },
  { re: /emergency directive|patch now|patch immediately/i,       boost: 1.2 },
  { re: /unauth(enticated)?\s+rce|pre-?auth\s+rce/i,              boost: 1.0 },
  { re: /cvss[:\s]*(9(\.\d)?|10(\.0)?)/i,                         boost: 0.9 },
  { re: /critical (flaw|vulnerability|bug)/i,                     boost: 0.7 },
  { re: /ransomware|extortion/i,                                  boost: 0.5 },
  { re: /\b\d{1,3}(\.\d+)?\s*(million|billion)\b.*(record|user|account|customer|patient)/i, boost: 0.6 },
];

export function importanceBoost(a: Scorable): number {
  const hay = `${a.title ?? ""} ${a.snippet ?? ""}`;
  let boost = a.kev ? 1.5 : 0;
  for (const s of SIGNALS) if (s.re.test(hay)) boost += s.boost;
  return Math.min(boost, 2.5); // cap
}
```

**Task 2.2 — Display-priority elevation.** In `router.ts`, after computing routing, elevate an article's display `priority` so the UI badge reflects importance:
- if `kev` OR boost ≥ 1.5 → at least `"critical"`
- else if boost ≥ 0.7 → at least `"high"`

Do this on a copy used for display; keep the original feed priority available if needed. Add an optional `kev?: boolean` to `Article`/`GroupedArticle`/`TrendingStory` in `scripts/types.ts` and mirror in `src/lib/types.ts`.

**Task 2.3 — CISA KEV integration (`scripts/fetch-kev.ts`).** Verified endpoint: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` (200, ~1.5 MB, 1623 entries, key format `"cveID": "CVE-2026-20253"`).

```ts
// scripts/fetch-kev.ts
export async function fetchKevSet(): Promise<Set<string>> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { signal: ctl.signal, headers: { "User-Agent": "CyberDrudgeBot/1.0" } }
    );
    clearTimeout(t);
    if (!res.ok) return new Set();
    const json = (await res.json()) as { vulnerabilities?: Array<{ cveID?: string }> };
    return new Set((json.vulnerabilities ?? []).map((v) => (v.cveID ?? "").toUpperCase()).filter(Boolean));
  } catch {
    return new Set(); // fail soft
  }
}
```

Wire into `scripts/build-data.ts`: fetch the KEV set in the same `Promise.all` as feeds/scrape, pass it into `routeAll`. In `routeAll`, for each article, extract CVE IDs with `/CVE-\d{4}-\d{4,7}/gi` from `title + snippet`; if any are in the KEV set, set `kev = true`. The boost + priority elevation then flow automatically.

**Acceptance (Phase 2):** KEV-referenced and "actively exploited" stories sort above generic same-day items; `kev` items render a badge (Phase 4); `tsc` green; KEV fetch failure still produces a full build.

---

### Phase 3 — Source quality & reliability

**Task 3.1 — Remove dead/unreliable feeds** from `FEEDS` in `scripts/sources.ts`:

| Feed | Reason |
|------|--------|
| PortSwigger Daily Swig | Publication discontinued (2024); empty |
| Mandiant | Parse failure; no reliable replacement feed |
| Trend Micro Research | `blog.trendmicro.com` DNS-dead |
| HackerOne | 404; no working blog RSS found |
| SC Media | Empty; Arc feed returns 403 — no working feed |
| trickest/collection | 404 |
| r/AskNetsec | HTTP 429 from CI, low value |

Keep `r/netsec` and `r/cybersecurity` but expect intermittent 429 from Actions IPs (graceful). Optional: add jittered retry/backoff in `fetch-feeds.ts`.

**Task 3.2 — Repoint Google Project Zero.** Change its URL to the verified working feed:
`https://googleprojectzero.blogspot.com/feeds/posts/default?alt=rss` (200, 10 items).

**Task 3.3 — Add verified high-quality feeds.** All validated live (HTTP 200 + valid XML + items > 0). Add to `FEEDS` with these category/priority/maxItems values:

```ts
// --- New high-signal sources (validated 2026-06-22) ---
{ name: "SANS ISC",            url: "https://isc.sans.edu/rssfeed_full.xml",                          category: "threat_intelligence", priority: "high" },
{ name: "Risky Business News", url: "https://risky.biz/feeds/risky-business-news/",                   category: "breaking_threats",    priority: "normal", maxItems: 8 },
{ name: "Securityaffairs",     url: "https://securityaffairs.com/feed",                               category: "breaking_threats",    priority: "normal" },
{ name: "Securelist",          url: "https://securelist.com/feed/",                                   category: "malware_analysis",    priority: "high" },
{ name: "Malwarebytes Labs",   url: "https://www.malwarebytes.com/blog/feed/index.xml",               category: "malware_analysis",    priority: "normal" },
{ name: "The DFIR Report",     url: "https://thedfirreport.com/feed/",                                category: "incident_response",   priority: "high" },
{ name: "watchTowr Labs",      url: "https://labs.watchtowr.com/rss/",                                category: "vulnerabilities",     priority: "high" },
{ name: "Zero Day Initiative", url: "https://www.zerodayinitiative.com/blog?format=rss",              category: "bug_bounty_research", priority: "high" },
{ name: "ZDI Advisories",      url: "https://www.zerodayinitiative.com/rss/published/",               category: "vulnerabilities",     priority: "high", maxItems: 8 },
{ name: "Google Online Security", url: "https://security.googleblog.com/feeds/posts/default",         category: "vulnerabilities",     priority: "high" },
{ name: "JFrog Security",      url: "https://jfrog.com/blog/feed/",                                   category: "vulnerabilities",     priority: "normal" },
{ name: "AWS Security Blog",   url: "https://aws.amazon.com/blogs/security/feed/",                    category: "cloud_security",      priority: "normal" },
{ name: "Sysdig",             url: "https://sysdig.com/feed/",                                        category: "cloud_security",      priority: "normal", maxItems: 8 },
{ name: "Cloudflare Blog",     url: "https://blog.cloudflare.com/rss/",                               category: "cloud_security",      priority: "normal" },
{ name: "Have I Been Pwned",   url: "https://feeds.feedburner.com/HaveIBeenPwnedLatestBreaches",      category: "data_breaches",       priority: "high" },
{ name: "ProjectDiscovery",    url: "https://blog.projectdiscovery.io/rss/",                          category: "security_tools",      priority: "normal" },
```

These directly fill the thin sections: HIBP → `data_breaches`; AWS/Sysdig/Cloudflare → `cloud_security`; watchTowr/ZDI/Project Zero/Google/JFrog → `vulnerabilities`; SANS ISC + Risky Biz → freshness cadence.

> Note: ZDI Advisories, Sysdig, and Risky Biz emit large feeds — the `maxItems` caps above keep them from dominating the global per-source cap.

**Task 3.4 — Fix SECURITY TOOLS (GitHub release feeds).** The `isReleaseNoise` filter in `scripts/fetch-feeds.ts` drops pure version-tag titles, zeroing these feeds. Add a feed type and synthesize meaningful titles:

```ts
// in FeedDef (sources.ts)
type?: "rss" | "github-release";
```

In `fetch-feeds.ts`, when `feed.type === "github-release"`:
- Skip `isReleaseNoise`.
- Build the title as `${feed.name.split("/").pop()} ${rawTitle} released` (e.g., `nuclei v3.x released`).
- Keep `maxItems` small (e.g., 3) so releases don't crowd out tool *news*.

Mark the existing GitHub feeds `type: "github-release"` and drop `trickest/collection`. ProjectDiscovery blog (Task 3.3) adds real tool news to the same section.

**Task 3.5 — Parser/fetch hardening.** Root-cause of "Maximum nested tags exceeded" and several EMPTY feeds is HTML/Cloudflare interstitials being fed to the XML parser. In `fetch-feeds.ts`, before `xmlParser.parse(body)`:
- Reject bodies whose first non-whitespace bytes are not `<?xml`, `<rss`, or `<feed` (treat as fetch failure with a clear error).
- Optionally check `Content-Type` includes `xml`.
- Wrap `xmlParser.parse` so a throw is recorded as `ok:false` with the message (already done) rather than silently zero.

**Acceptance (Phase 3):** Cleaned feed list ok/total ≥ 95%; `data_breaches`, `cloud_security` each ≥ 3 sources; `security_tools` ≥ 4 items; no XML-parse exceptions in `feedStats`.

---

### Phase 4 — Make freshness visible (client)

**Task 4.1 — `NEW` badge + aging de-emphasis** in `src/components/Headline.tsx`. Compute `const h = (Date.now() - a.publishedAt) / 3_600_000;`
- `h < 6` → show a small `NEW` pill (reuse `.related-badge` styling or add `.new-badge`).
- `h > 72` → add a class that lowers opacity (e.g., `opacity-70`) so stale items recede.
- If `a.kev` → show a `KEV` pill (siren color) — high-signal cue.

**Task 4.2 — "Updated Xm ago" in masthead.** In `src/components/Header.tsx` (App already passes `generatedAt`), render `Updated {timeAgo(generatedAt)}` using `src/lib/timeAgo.ts`. Add a timestamp to `src/components/LeadStory.tsx`.

**Task 4.3 (OPTIONAL — left to executor's discretion).** "LATEST" strip: a strict reverse-chronological rail of the freshest ~10 articles across all categories, rendered above the 3-column grid in `src/App.tsx`. Build it from `data.categories.flatMap(c => c.articlesAll)`, dedupe by `id`, sort by `publishedAt` desc, slice 10. **Recommendation: skip unless desired** — it changes top-of-page layout; Phases 1–2 already surface freshness through ranking. Implement only if the layout change is acceptable.

**Acceptance (Phase 4):** `tsc` green; bundle still ~flat; NEW/KEV badges render; masthead shows update time.

---

### Phase 5 — Guardrails (so this lasts)

**Task 5.1 — `scripts/check-data.ts` + `npm run build:check`.** After `build:data`, read `headlines.json` and report:
- feed health `ok/total` (warn if < 90%, list failures);
- per-category: distinct source count and visible median age (warn if a category exceeds its `softAgeHours` median);
- entity-leak scan: any title matching `/&amp;|&#\d+;|&[a-z]+;/`;
- global per-source cap not exceeded.

Make it **warn-only by default**; add a `--strict` flag that exits non-zero (for future CI gating).

**Task 5.2 — CI typecheck step.** Add `npx tsc --noEmit` to `.github/workflows/refresh.yml` before the build step. Optional: add `npm run build:check` as a non-blocking step.

**Task 5.3 — (Optional) Dependabot** for `npm` + `github-actions` (see `docs/SBOM.md` §8).

**Acceptance (Phase 5):** `npm run build:check` prints a health report; CI runs typecheck.

---

## 4. Type changes summary

`scripts/types.ts` and `src/lib/types.ts` (keep in sync):

```ts
export interface Article {
  // ...existing...
  kev?: boolean; // set in router when a referenced CVE is in CISA KEV
}
// GroupedArticle & TrendingStory inherit/echo `kev?: boolean`
```

`scripts/sources.ts`:
- `CategoryDef`: add `maxAgeHours?`, `softAgeHours?`.
- `FeedDef`: add `type?: "rss" | "github-release"`.

---

## 5. Parameter reference (single place to tune)

| Constant | File | Value | Meaning |
|----------|------|-------|---------|
| `HALF_LIFE_HOURS` | `score.ts` | 48 | Recency decay half-life |
| `TRENDING_MAX_AGE_HOURS` | `score.ts` | 72 | Trending eligibility |
| `LEAD_MAX_AGE_HOURS` | `score.ts` | 96 | Lead-story eligibility |
| `MIN_VISIBLE` | `router.ts` | 4 | Backfill threshold |
| `GLOBAL_PER_SOURCE_CAP` | `router.ts` | 6 | Keep as-is |
| importance cap | `score.ts` | 2.5 | Max additive boost |
| per-category `softAgeHours` / `maxAgeHours` | `sources.ts` | see table | Freshness windows |

---

## 6. Verification script

Run after each phase; paste the numbers into the [baseline table](#baseline-measurements).

```bash
npm run build:data && node -e '
const fs=require("fs");const p=JSON.parse(fs.readFileSync("public/data/headlines.json","utf8"));
const now=p.generatedAt||Date.now();const stats=p.feedStats||[];
console.log("feeds ok:",stats.filter(s=>s.ok).length,"/",stats.length);
for(const s of stats.filter(s=>!s.ok||s.count===0))console.log("  ",s.ok?"EMPTY":"FAIL",s.name,s.error||"");
const seen=new Set();let ages=[];
for(const c of p.categories)for(const a of (c.articles||[])){if(seen.has(a.id))continue;seen.add(a.id);ages.push((now-a.publishedAt)/3600000);}
ages.sort((x,y)=>x-y);const q=f=>ages.length?ages[Math.floor(f*(ages.length-1))].toFixed(1):"-";
console.log("visible:",ages.length,"median:",q(.5),"p90:",q(.9),"max:",q(1));
const b={"<6h":0,"6-24h":0,"1-3d":0,"3-7d":0,"7-14d":0,">14d":0};
for(const h of ages){h<6?b["<6h"]++:h<24?b["6-24h"]++:h<72?b["1-3d"]++:h<168?b["3-7d"]++:h<336?b["7-14d"]++:b[">14d"]++;}
console.log(b);
console.log("trending:",(p.trending||[]).length,"| lead age h:",p.leadStory?((now-p.leadStory.publishedAt)/3600000).toFixed(1):"none");
for(const c of p.categories){const s=new Set((c.articles||[]).map(a=>a.source)).size;if(s<3)console.log("  thin:",c.id,"sources=",s,"items=",(c.articles||[]).length);}
'
```

---

## 7. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Importance regex false positives (e.g., "critical" in marketing copy) | Boosts are recency-gated and capped at 2.5; tune `SIGNALS` if noisy |
| Tighter age windows empty out a slow category | `MIN_VISIBLE` backfill + per-category `maxAgeHours` for slow lanes |
| New feeds rate-limit or change URLs later | `build:check` (Phase 5) surfaces drops; all adds fail soft |
| KEV endpoint slow/large (1.5 MB) | 10s timeout, fail-soft to empty set; only parses `cveID` |
| ZDI/Sysdig/Risky flood global cap | `maxItems` caps in Task 3.3 |
| Scoring drift between router & grouping | Eliminated by shared `score.ts` (Phase 0) |

---

## 8. Rollout

Land in small, reviewable commits — ideally one per phase:

1. `refactor: extract shared scoring into lib/score.ts`
2. `feat(rank): per-category freshness windows + starvation-aware fill`
3. `feat(rank): importance signals + CISA KEV boost`
4. `feat(sources): prune dead feeds, add 16 validated sources, fix tool feeds`
5. `feat(ui): NEW/KEV badges, freshness timestamps`
6. `chore(ops): build:check health gate + CI typecheck`

After each: `npx tsc --noEmit`, `npm run build`, run the verification script. Remember the cron commits JSON to `main` — `git pull --rebase` before pushing (see `docs/HANDOFF.md`).

---

## 9. Definition of done

- [ ] Visible p90 age ≤ ~5 days; 7–14d share < 5%
- [ ] Feed ok/total ≥ 95% on the cleaned list; no XML-parse exceptions
- [ ] `data_breaches`, `cloud_security`, `security_tools` each ≥ 3 sources / non-empty
- [ ] KEV + "actively exploited" stories rank above generic same-day items
- [ ] Trending all ≤ 72h; lead ≤ 96h
- [ ] NEW/KEV badges + "updated" timestamp visible
- [ ] `npm run build:check` reports health; CI typecheck added
- [ ] `npx tsc --noEmit` green; bundle ~flat
