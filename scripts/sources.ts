/**
 * scripts/sources.ts
 * ------------------
 * This is the ONLY file you normally edit. Add/remove feeds, tweak categories,
 * edit keywords. The hourly cron picks changes up automatically on next run.
 *
 * Adding a feed:
 *   { name: "My Source", url: "https://example.com/feed.xml", category: "threat_intelligence", priority: "high" }
 *   // For GitHub release feeds, add type: "github-release" so titles are
 *   // synthesized ("nuclei v3.2 released") instead of dropped by the
 *   // release-noise filter.
 *
 * Categories are stable string IDs (see CATEGORIES below). Each feed lives in
 * one "home" category; the keyword router can also fan an article out to other
 * categories based on title+summary text matches.
 *
 * Category freshness windows (softAgeHours / maxAgeHours) control how long
 * items stay visible: within softAgeHours = always shown; between soft and
 * max = only backfill when a section would otherwise drop below MIN_VISIBLE
 * (see scripts/lib/router.ts); beyond max = dropped.
 */

export type CategoryId =
  | "breaking_threats"
  | "vulnerabilities"
  | "malware_analysis"
  | "threat_intelligence"
  | "data_breaches"
  | "phishing_fraud"
  | "cloud_security"
  | "network_endpoint"
  | "identity_access"
  | "ai_security"
  | "crypto_pqc"
  | "ics_ot"
  | "policy_regulation"
  | "vendor_product"
  | "incident_response"
  | "bug_bounty_research"
  | "security_tools"
  | "offense_red_team";

export type Priority = "critical" | "high" | "normal";

export interface FeedDef {
  name: string;
  url: string;
  category: CategoryId;
  priority?: Priority;
  /** Override per-feed item cap (default 15). */
  maxItems?: number;
  /** Feed shape. "github-release" synthesizes meaningful titles so the
   *  release-noise filter doesn't strip pure version tags. */
  type?: "rss" | "github-release";
  /** Extra request headers merged into the fetch (e.g. a cookie a site's
   *  bot-check JS would set). Use sparingly; feeds fail soft if it breaks. */
  headers?: Record<string, string>;
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  /** Optional column grouping for display (left/center/right). */
  column?: "left" | "center" | "right";
  /** Items older than this are dropped from this category (hours). */
  maxAgeHours?: number;
  /** Preferred freshness window; older items only backfill if the section
   *  would otherwise drop below MIN_VISIBLE. */
  softAgeHours?: number;
}

export interface KeywordRule {
  match: string[];
  routeTo: CategoryId;
}

export const CATEGORIES: CategoryDef[] = [
  // Fast lanes — operational, 5-day hard cap, 2-day preferred window.
  { id: "breaking_threats",    label: "BREAKING THREATS",     column: "left",   softAgeHours: 48,  maxAgeHours: 120 },
  { id: "phishing_fraud",      label: "PHISHING & FRAUD",     column: "center", softAgeHours: 48,  maxAgeHours: 120 },

  // Standard lanes — 10-day hard cap, 4-day preferred window.
  // (incident_response lives here, not in the fast lane: DFIR/IR write-ups
  // publish days after the intrusion and stay relevant for weeks.)
  { id: "incident_response",   label: "INCIDENT RESPONSE",    column: "right",  softAgeHours: 96,  maxAgeHours: 240 },
  { id: "vulnerabilities",     label: "VULNERABILITIES",      column: "left",   softAgeHours: 96,  maxAgeHours: 240 },
  { id: "malware_analysis",    label: "MALWARE ANALYSIS",     column: "left",   softAgeHours: 96,  maxAgeHours: 240 },
  { id: "threat_intelligence", label: "THREAT INTELLIGENCE",  column: "left",   softAgeHours: 96,  maxAgeHours: 240 },
  { id: "data_breaches",       label: "DATA BREACHES",        column: "center", softAgeHours: 96,  maxAgeHours: 240 },
  { id: "cloud_security",      label: "CLOUD SECURITY",       column: "center", softAgeHours: 96,  maxAgeHours: 240 },
  { id: "network_endpoint",    label: "NETWORK & ENDPOINT",   column: "center", softAgeHours: 96,  maxAgeHours: 240 },
  { id: "identity_access",     label: "IDENTITY & ACCESS",    column: "center", softAgeHours: 96,  maxAgeHours: 240 },
  { id: "ai_security",         label: "AI SECURITY",          column: "center", softAgeHours: 96,  maxAgeHours: 240 },
  { id: "ics_ot",              label: "ICS/OT SECURITY",      column: "center", softAgeHours: 96,  maxAgeHours: 240 },
  { id: "offense_red_team",    label: "OFFENSE / RED TEAM",   column: "right",  softAgeHours: 96,  maxAgeHours: 240 },

  // Slow lanes — 14-day hard cap, 7-day preferred window.
  { id: "policy_regulation",   label: "POLICY & REGULATION",  column: "right",  softAgeHours: 168, maxAgeHours: 336 },
  { id: "vendor_product",      label: "VENDOR & PRODUCT NEWS",column: "right",  softAgeHours: 168, maxAgeHours: 336 },
  { id: "bug_bounty_research", label: "BUG BOUNTY & RESEARCH",column: "right",  softAgeHours: 168, maxAgeHours: 336 },
  { id: "security_tools",      label: "SECURITY TOOLS",       column: "right",  softAgeHours: 168, maxAgeHours: 336 },
  { id: "crypto_pqc",          label: "CRYPTO & PQC",         column: "center", softAgeHours: 168, maxAgeHours: 336 },
];

/**
 * Sources that should NOT be keyword-routed. Generic-post sources (Reddit,
 * HN-style aggregators) match too broadly and pollute every category — they
 * should only ever appear in their own home category.
 */
export const KEYWORD_AGNOSTIC_SOURCES = new Set<string>([
  "Lobsters Security",
  "HN Security 30+",
  "This Week in 4n6",
  "tl;dr sec",
]);

export const FEEDS: FeedDef[] = [
  // Independent press / news
  { name: "BleepingComputer",      url: "https://www.bleepingcomputer.com/feed/",                              category: "breaking_threats",    priority: "critical" },
  { name: "The Hacker News",       url: "https://feeds.feedburner.com/TheHackersNews",                        category: "breaking_threats",    priority: "critical" },
  { name: "Dark Reading",          url: "https://www.darkreading.com/rss.xml",                                category: "breaking_threats",    priority: "high" },
  { name: "The Record",            url: "https://therecord.media/feed/",                                      category: "breaking_threats",    priority: "high" },
  { name: "Krebs on Security",     url: "https://krebsonsecurity.com/feed/",                                  category: "threat_intelligence", priority: "critical" },
  { name: "SecurityWeek",          url: "https://www.securityweek.com/feed/",                                 category: "breaking_threats",    priority: "high" },
  { name: "CyberScoop",            url: "https://www.cyberscoop.com/feed/",                                   category: "policy_regulation",   priority: "normal" },
  { name: "Graham Cluley",         url: "https://grahamcluley.com/feed/",                                     category: "breaking_threats",    priority: "normal" },
  { name: "Securityaffairs",       url: "https://securityaffairs.com/feed",                                   category: "breaking_threats",    priority: "normal" },
  { name: "Risky Business News",   url: "https://risky.biz/feeds/risky-business-news/",                       category: "breaking_threats",    priority: "normal", maxItems: 8 },

  // Vendor research blogs (RSS-capable)
  { name: "Google Project Zero",   url: "https://projectzero.google/feed.xml",                                category: "vulnerabilities",    priority: "critical" },
  { name: "Talos",                 url: "https://blog.talosintelligence.com/rss/",                            category: "malware_analysis",    priority: "high" },
  { name: "Palo Alto Unit 42",     url: "https://unit42.paloaltonetworks.com/feed/",                          category: "threat_intelligence", priority: "high" },
  { name: "Microsoft Security",    url: "https://www.microsoft.com/en-us/security/blog/feed/",                category: "threat_intelligence", priority: "high" },
  { name: "SentinelOne",           url: "https://www.sentinelone.com/feed/",                                  category: "malware_analysis",    priority: "high" },
  { name: "ESET WeLiveSecurity",   url: "https://www.welivesecurity.com/feed/",                               category: "malware_analysis",    priority: "normal" },
  { name: "Sophos News",           url: "https://news.sophos.com/feed",                                       category: "malware_analysis",    priority: "normal" },
  { name: "Securelist",            url: "https://securelist.com/feed/",                                       category: "malware_analysis",    priority: "high" },
  { name: "Malwarebytes Labs",     url: "https://www.malwarebytes.com/blog/feed/index.xml",                   category: "malware_analysis",    priority: "normal" },
  { name: "Rapid7",                url: "https://blog.rapid7.com/rss/",                                       category: "vulnerabilities",     priority: "normal" },
  { name: "Check Point Research",  url: "https://research.checkpoint.com/feed/",                              category: "threat_intelligence", priority: "normal" },
  { name: "Huntress",              url: "https://www.huntress.com/blog/rss.xml",                              category: "incident_response",   priority: "normal" },
  { name: "GreyNoise",             url: "https://www.greynoise.io/blog/rss.xml",                              category: "threat_intelligence", priority: "normal" },
  { name: "Trail of Bits",         url: "https://blog.trailofbits.com/feed/",                                 category: "bug_bounty_research", priority: "normal" },
  { name: "Tenable",               url: "https://www.tenable.com/blog/feed",                                  category: "vulnerabilities",     priority: "normal" },
  { name: "Qualys",                url: "https://blog.qualys.com/feed/",                                      category: "vulnerabilities",     priority: "normal" },
  { name: "PortSwigger Research",  url: "https://portswigger.net/research/rss",                               category: "bug_bounty_research", priority: "high" },
  { name: "watchTowr Labs",        url: "https://labs.watchtowr.com/rss/",                                    category: "vulnerabilities",     priority: "high" },
  { name: "Zero Day Initiative",   url: "https://www.zerodayinitiative.com/blog?format=rss",                  category: "bug_bounty_research", priority: "high" },
  { name: "ZDI Advisories",        url: "https://www.zerodayinitiative.com/rss/published/",                   category: "vulnerabilities",     priority: "high", maxItems: 8 },
  { name: "Google Online Security",url: "https://security.googleblog.com/feeds/posts/default",                category: "vulnerabilities",     priority: "high" },
  { name: "JFrog Security",        url: "https://jfrog.com/blog/feed/",                                       category: "vulnerabilities",     priority: "normal" },
  { name: "AWS Security Blog",     url: "https://aws.amazon.com/blogs/security/feed/",                        category: "cloud_security",      priority: "normal" },
  { name: "Sysdig",                url: "https://sysdig.com/feed/",                                           category: "cloud_security",      priority: "normal", maxItems: 8 },
  { name: "Cloudflare Blog",       url: "https://blog.cloudflare.com/rss/",                                   category: "cloud_security",      priority: "normal" },
  { name: "Have I Been Pwned",     url: "https://feeds.feedburner.com/HaveIBeenPwnedLatestBreaches",          category: "data_breaches",       priority: "high" },

  // Individual / Substack
  { name: "Schneier on Security",  url: "https://www.schneier.com/feed/",                                     category: "policy_regulation",   priority: "high" },
  { name: "Troy Hunt",             url: "https://www.troyhunt.com/rss/",                                      category: "data_breaches",       priority: "high" },
  { name: "Daniel Miessler",       url: "https://danielmiessler.com/feed/",                                   category: "ai_security",         priority: "normal" },

  // Community aggregators (keyword-agnostic — see KEYWORD_AGNOSTIC_SOURCES).
  // Replaced r/netsec + r/cybersecurity: reddit.com 403/429s GitHub Actions IPs.
  { name: "Lobsters Security",     url: "https://lobste.rs/t/security.rss",                                  category: "bug_bounty_research", priority: "normal", maxItems: 10 },
  { name: "HN Security 30+",       url: "https://hnrss.org/newest?q=vulnerability+OR+breach+OR+ransomware&points=30", category: "breaking_threats", priority: "normal", maxItems: 10 },

  // Government / org
  { name: "CISA Advisories",       url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",             category: "vulnerabilities",     priority: "high" },
  { name: "CISA ICS Advisories",   url: "https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml", category: "ics_ot",              priority: "high", maxItems: 10 },
  { name: "MSRC",                  url: "https://api.msrc.microsoft.com/update-guide/rss",                    category: "vulnerabilities",     priority: "high" },
  { name: "CERT-EU",               url: "https://cert.europa.eu/publications/security-advisories-rss",       category: "policy_regulation",   priority: "normal" },
  { name: "NCSC UK",               url: "https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml",        category: "policy_regulation",   priority: "normal" },
  { name: "SANS ISC",              url: "https://isc.sans.edu/rssfeed_full.xml",                             category: "threat_intelligence", priority: "high" },
  { name: "CERT/CC Vuln Notes",    url: "https://www.kb.cert.org/vuls/atomfeed/",                            category: "vulnerabilities",     priority: "high", maxItems: 10 },
  { name: "SEC Press Releases",    url: "https://www.sec.gov/news/pressreleases.rss",                        category: "policy_regulation",   priority: "normal", maxItems: 6 },
  { name: "FBI IC3 PSAs",          url: "https://www.ic3.gov/PSA/RSS",                                       category: "phishing_fraud",      priority: "high", maxItems: 5 },
  { name: "NIST Cyber Insights",   url: "https://www.nist.gov/blogs/cybersecurity-insights/rss.xml",         category: "crypto_pqc",          priority: "normal", maxItems: 8 },
  // Third-party JSON->RSS bridge over CISA KEV additions (fetch-kev.ts JSON
  // stays the source of truth for scoring; this surfaces them as headlines).
  { name: "CISA KEV Additions",    url: "https://kevin.gtfkd.com/rss",                                       category: "vulnerabilities",     priority: "critical", maxItems: 6 },

  // Incident response / DFIR
  { name: "The DFIR Report",       url: "https://thedfirreport.com/feed/",                                   category: "incident_response",   priority: "high" },
  { name: "This Week in 4n6",      url: "https://thisweekin4n6.com/feed/",                                   category: "incident_response",   priority: "normal", maxItems: 4 },
  { name: "Sygnia",                url: "https://www.sygnia.co/feed/",                                       category: "incident_response",   priority: "high", maxItems: 8 },
  { name: "Volexity",              url: "https://www.volexity.com/feed/",                                    category: "incident_response",   priority: "high", maxItems: 8 },
  { name: "Google Threat Intelligence", url: "https://cloudblog.withgoogle.com/topics/threat-intelligence/rss/", category: "threat_intelligence", priority: "critical", maxItems: 10 },
  { name: "Group-IB",              url: "https://blog.group-ib.com/rss.xml",                                 category: "threat_intelligence", priority: "high", maxItems: 10 },

  // AI security
  { name: "Embrace The Red",       url: "https://embracethered.com/blog/index.xml",                          category: "ai_security",         priority: "high", maxItems: 10 },
  { name: "Simon Willison (security)", url: "https://simonwillison.net/tags/security.atom",                  category: "ai_security",         priority: "normal", maxItems: 10 },
  { name: "NVIDIA AI Security",    url: "https://developer.nvidia.com/blog/category/cybersecurity/feed/",    category: "ai_security",         priority: "normal", maxItems: 10 },

  // ICS / OT
  // Industrial Cyber gates plain fetches behind a Sentry JS check; the cookie
  // below is what their own JS sets for every visitor. Fails soft if removed.
  { name: "Industrial Cyber",      url: "https://industrialcyber.co/feed/",                                  category: "ics_ot",              priority: "high", maxItems: 8,
    headers: { Cookie: "SentryVerifiedJS=true" } },
  { name: "Dale Peterson",         url: "https://dale-peterson.com/feed/",                                   category: "ics_ot",              priority: "normal", maxItems: 6 },

  // Identity & access
  { name: "SpecterOps",            url: "https://specterops.io/feed/",                                       category: "identity_access",     priority: "high", maxItems: 10 },
  { name: "Permiso",               url: "https://permiso.io/blog/rss.xml",                                   category: "identity_access",     priority: "high", maxItems: 8 },
  { name: "dirkjanm.io",           url: "https://dirkjanm.io/feed.xml",                                      category: "identity_access",     priority: "high", maxItems: 5 },
  { name: "Entra.News",            url: "https://entra.news/feed",                                           category: "identity_access",     priority: "normal", maxItems: 5 },

  // Cloud security
  { name: "Datadog Security Labs", url: "https://securitylabs.datadoghq.com/rss/feed.xml",                   category: "cloud_security",      priority: "high", maxItems: 10 },

  // Data breaches / fraud
  { name: "DataBreaches.net",      url: "https://databreaches.net/feed/",                                    category: "data_breaches",       priority: "high" },
  { name: "TechCrunch Security",   url: "https://techcrunch.com/category/security/feed/",                    category: "data_breaches",       priority: "high", maxItems: 10 },
  { name: "InfoStealers",          url: "https://www.infostealers.com/feed/",                                category: "data_breaches",       priority: "normal", maxItems: 8 },
  { name: "Proofpoint Threat Insight", url: "https://www.proofpoint.com/us/threat-insight-blog.xml",         category: "phishing_fraud",      priority: "high", maxItems: 10 },
  { name: "Cofense",               url: "https://cofense.com/feed/",                                         category: "phishing_fraud",      priority: "normal", maxItems: 8 },

  // Vendor / market
  { name: "Return on Security",    url: "https://www.returnonsecurity.com/rss.xml",                          category: "vendor_product",      priority: "normal", maxItems: 6 },
  { name: "Help Net Security",     url: "https://www.helpnetsecurity.com/feed/",                             category: "vendor_product",      priority: "normal", maxItems: 8 },

  // Security tools — GitHub release feeds (synthesized titles) + tool vendor blog
  { name: "projectdiscovery/nuclei",      url: "https://github.com/projectdiscovery/nuclei/releases.atom",        category: "security_tools", priority: "normal", type: "github-release", maxItems: 3 },
  { name: "ffuf/ffuf",                    url: "https://github.com/ffuf/ffuf/releases.atom",                      category: "security_tools", priority: "normal", type: "github-release", maxItems: 3 },
  { name: "OJ/gobuster",                  url: "https://github.com/OJ/gobuster/releases.atom",                    category: "security_tools", priority: "normal", type: "github-release", maxItems: 3 },
  { name: "projectdiscovery/httpx",       url: "https://github.com/projectdiscovery/httpx/releases.atom",         category: "security_tools", priority: "normal", type: "github-release", maxItems: 3 },
  { name: "projectdiscovery/subfinder",   url: "https://github.com/projectdiscovery/subfinder/releases.atom",     category: "security_tools", priority: "normal", type: "github-release", maxItems: 3 },
  { name: "zaproxy/zaproxy",              url: "https://github.com/zaproxy/zaproxy/releases.atom",                category: "security_tools", priority: "normal", type: "github-release", maxItems: 3 },
  { name: "sqlmapproject/sqlmap",         url: "https://github.com/sqlmapproject/sqlmap/releases.atom",           category: "security_tools", priority: "normal", type: "github-release", maxItems: 3 },
  { name: "rapid7/metasploit-framework",  url: "https://github.com/rapid7/metasploit-framework/releases.atom",    category: "security_tools", priority: "normal", type: "github-release", maxItems: 3 },
  { name: "ProjectDiscovery Blog",        url: "https://blog.projectdiscovery.io/rss/",                          category: "security_tools", priority: "normal" },

  // Offense / red team
  { name: "Offensive Security",   url: "https://www.offsec.com/feed",                                        category: "offense_red_team",    priority: "normal" },
  { name: "Red Canary Blog",      url: "https://redcanary.com/blog/feed/",                                   category: "incident_response",   priority: "normal" },
  { name: "Outflank",             url: "https://www.outflank.nl/blog/feed/",                                 category: "offense_red_team",    priority: "normal" },
  { name: "Horizon3.ai",          url: "https://www.horizon3.ai/feed/",                                      category: "offense_red_team",    priority: "high", maxItems: 8 },
  { name: "Searchlight Cyber Research", url: "https://slcyber.io/research/feed/",                            category: "offense_red_team",    priority: "high", maxItems: 8 },
  { name: "TrustedSec",           url: "https://trustedsec.com/feed.rss",                                    category: "offense_red_team",    priority: "normal", maxItems: 8 },

  // Newsletters / digests
  { name: "tl;dr sec",            url: "https://tldrsec.com/feed.xml",                                       category: "security_tools",      priority: "normal", maxItems: 4 },
];

/**
 * Keyword rules: an article is routed into its feed's home category PLUS any
 * category whose keyword list matches title or summary (case-insensitive).
 *
 * Matching semantics (compiled in scripts/lib/router.ts):
 *   - whole-word by default ("apt" no longer matches "laptop"/"capture")
 *   - trailing "*" = prefix match ("encrypt*" matches encrypted/encryption)
 *   - non-word edge chars behave as written ("cve-" matches "CVE-2026-...")
 */
export const KEYWORDS: KeywordRule[] = [
  { match: ["ransomware", "lockbit", "blackcat", "akira", "extortion"],
    routeTo: "breaking_threats" },
  { match: ["cve-", "0day", "zero-day", "rce", "patch tuesday", "critical flaw", "actively exploited"],
    routeTo: "vulnerabilities" },
  { match: ["apt", "threat actor", "campaign", "attributed to", "chinese", "russian", "iranian", "north korean"],
    routeTo: "threat_intelligence" },
  { match: ["data breach", "leaked", "exposed database", "personal information of", "credentials dump"],
    routeTo: "data_breaches" },
  { match: ["phishing", "bec", "business email compromise", "scam*", "smishing", "social engineering"],
    routeTo: "phishing_fraud" },
  { match: ["aws", "s3 bucket", "iam", "azure", "misconfig*", "kubernetes", "gcp"],
    routeTo: "cloud_security" },
  { match: ["edr", "xdr", "siem", "detection rule", "yara", "sigma rule", "detection engineering",
            "firewall", "vpn", "fortinet", "ivanti", "citrix", "palo alto", "f5", "netscaler"],
    routeTo: "network_endpoint" },
  { match: ["okta", "entra", "saml", "mfa", "identity", "oauth", "passkey*", "active directory"],
    routeTo: "identity_access" },
  { match: ["prompt injection", "llm attack", "ai red team", "model security", "genai", "model context protocol"],
    routeTo: "ai_security" },
  { match: ["scada", "ot security", "ics", "critical infrastructure", "plc"],
    routeTo: "ics_ot" },
  { match: ["eu ai act", "sec disclosure", "nis2", "gdpr", "regulation", "executive order", "enforcement action"],
    routeTo: "policy_regulation" },
  { match: ["raises $", "raised $", "series a", "series b", "ipo", "acquired", "acquisition", "merger"],
    routeTo: "vendor_product" },
  { match: ["reverse engineering", "malware analysis", "new family", "stealer", "infostealer", "loader", "botnet"],
    routeTo: "malware_analysis" },
  { match: ["incident response", "dfir", "forensics", "lessons learned", "post-mortem", "threat hunt*"],
    routeTo: "incident_response" },
  { match: ["bug bounty", "hackerone", "bugcrowd", "write-up", "writeup", "vulnerability research", "security research"],
    routeTo: "bug_bounty_research" },
  { match: ["red team*", "purple team*", "offensive tradecraft", "c2", "command and control", "adversary emulation"],
    routeTo: "offense_red_team" },
  { match: ["cryptograph*", "post-quantum", "pqc", "quantum-safe", "tls", "cipher*"],
    routeTo: "crypto_pqc" },
];

/** Optional scraper configs for sites without usable RSS. */
export interface ScrapeDef {
  name: string;
  category: CategoryId;
  priority?: Priority;
  listingUrl: string;
  /** Regex with capture group 1 = article URL, group 2 = title. */
  cardPattern: string;
  /** Optional snippet capture group index (default none). */
  snippetGroup?: number;
  maxItems?: number;
}

/**
 * These are SPA-only vendor blogs that historically have no usable RSS.
 * Each pattern is a regex over raw HTML; we run it on the listing page HTML.
 * We keep these conservative to avoid blow-ups.
 */
export const SCRAPE_SOURCES: ScrapeDef[] = [
  {
    name: "CrowdStrike Blog",
    category: "vendor_product",
    priority: "high",
    listingUrl: "https://www.crowdstrike.com/blog/",
    cardPattern: '<a[^>]+href="([^"]+)"[^>]*>([^<]+)</a>',
    maxItems: 12,
  },
];

/** Sector-relevant tickers (Yahoo chart API, silent-fail to {} on error). */
// CYBR intentionally absent: CyberArk delisted after the Palo Alto acquisition.
export const STOCK_TICKERS = ["CRWD", "PANW", "S", "FTNT", "ZS", "OKTA", "TENB", "NET"];
