/**
 * scripts/fetch-kev.ts
 * --------------------
 * Pulls the CISA Known Exploited Vulnerabilities catalog and returns the set
 * of CVE IDs it references (uppercased). The router uses this to flag
 * articles that mention a KEV CVE, which boosts ranking and elevates display
 * priority — so "actively exploited" stories surface above generic same-day
 * items.
 *
 * Endpoint (verified 2026-06-22): ~1.5 MB JSON, key shape:
 *   { vulnerabilities: [ { cveID: "CVE-2026-20253", ... }, ... ] }
 *
 * Fail-soft: any error returns an empty set so the build never breaks.
 */

const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const TIMEOUT_MS = 10_000;

export async function fetchKevSet(): Promise<Set<string>> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    const res = await fetch(KEV_URL, {
      signal: ctl.signal,
      headers: { "User-Agent": "CyberDrudgeBot/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) {
      console.warn(`[fetch-kev] non-OK response: HTTP ${res.status}`);
      return new Set();
    }
    const json = (await res.json()) as {
      vulnerabilities?: Array<{ cveID?: string }>;
    };
    const set = new Set<string>();
    for (const v of json.vulnerabilities ?? []) {
      const id = (v?.cveID ?? "").toUpperCase().trim();
      if (id) set.add(id);
    }
    console.log(`[fetch-kev] loaded ${set.size} KEV CVEs`);
    return set;
  } catch (e) {
    console.warn(`[fetch-kev] failed: ${e instanceof Error ? e.message : e}`);
    return new Set();
  }
}
