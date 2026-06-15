/**
 * scripts/sources.ts
 * ------------------
 * This is the ONLY file you normally edit. Add/remove feeds, tweak categories,
 * edit keywords. The hourly cron picks changes up automatically on next run.
 *
 * Adding a feed:
 *   { name: "My Source", url: "https://example.com/feed.xml", category: "threat_intelligence", priority: "high" }
 *
 * Categories are stable string IDs (see CATEGORIES below). Each feed lives in
 * one "home" category; the keyword router can also fan an article out to other
 * categories based on title+summary text matches.
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
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  /** Optional column grouping for display (left/center/right). */
  column?: "left" | "center" | "right";
}

export interface KeywordRule {
  match: string[];
  routeTo: CategoryId;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "breaking_threats",    label: "BREAKING THREATS",     column: "left" },
  { id: "vulnerabilities",     label: "VULNERABILITIES",      column: "left" },
  { id: "malware_analysis",    label: "MALWARE ANALYSIS",     column: "left" },
  { id: "threat_intelligence", label: "THREAT INTELLIGENCE",  column: "left" },
  { id: "data_breaches",       label: "DATA BREACHES",        column: "left" },
  { id: "phishing_fraud",      label: "PHISHING & FRAUD",     column: "left" },
  { id: "cloud_security",      label: "CLOUD SECURITY",       column: "center" },
  { id: "network_endpoint",    label: "NETWORK & ENDPOINT",   column: "center" },
  { id: "identity_access",     label: "IDENTITY & ACCESS",    column: "center" },
  { id: "ai_security",         label: "AI SECURITY",          column: "center" },
  { id: "crypto_pqc",          label: "CRYPTO & PQC",         column: "center" },
  { id: "ics_ot",              label: "ICS/OT SECURITY",      column: "center" },
  { id: "policy_regulation",   label: "POLICY & REGULATION",  column: "right" },
  { id: "vendor_product",      label: "VENDOR & PRODUCT NEWS",column: "right" },
  { id: "incident_response",   label: "INCIDENT RESPONSE",    column: "right" },
  { id: "bug_bounty_research", label: "BUG BOUNTY & RESEARCH",column: "right" },
  { id: "security_tools",      label: "SECURITY TOOLS",       column: "right" },
  { id: "offense_red_team",    label: "OFFENSE / RED TEAM",   column: "right" },
];

/**
 * Sources that should NOT be keyword-routed. Generic-post sources (Reddit,
 * HN-style aggregators) match too broadly and pollute every category — they
 * should only ever appear in their own home category.
 */
export const KEYWORD_AGNOSTIC_SOURCES = new Set<string>([
  "r/netsec",
  "r/cybersecurity",
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
  { name: "SC Media",              url: "https://www.scmagazine.com/feed",                                    category: "breaking_threats",    priority: "normal" },
  { name: "Graham Cluley",         url: "https://grahamcluley.com/feed/",                                     category: "breaking_threats",    priority: "normal" },

  // Vendor research blogs (RSS-capable)
  { name: "Google Project Zero",   url: "https://googleprojectzero.blogspot.com/feeds/posts/default",        category: "vulnerabilities",     priority: "critical" },
  { name: "Talos",                 url: "https://blog.talosintelligence.com/rss/",                            category: "malware_analysis",    priority: "high" },
  { name: "Palo Alto Unit 42",     url: "https://unit42.paloaltonetworks.com/feed/",                          category: "threat_intelligence", priority: "high" },
  { name: "Mandiant",              url: "https://www.mandiant.com/resources/blog/rss.xml",                    category: "threat_intelligence", priority: "high" },
  { name: "Microsoft Security",    url: "https://www.microsoft.com/en-us/security/blog/feed/",                category: "threat_intelligence", priority: "high" },
  { name: "SentinelOne",           url: "https://www.sentinelone.com/feed/",                                  category: "malware_analysis",    priority: "high" },
  { name: "ESET WeLiveSecurity",   url: "https://www.welivesecurity.com/feed/",                               category: "malware_analysis",    priority: "normal" },
  { name: "Trend Micro Research",  url: "https://blog.trendmicro.com/feed/",                                  category: "malware_analysis",    priority: "normal" },
  { name: "Sophos News",           url: "https://news.sophos.com/feed",                                       category: "malware_analysis",    priority: "normal" },
  { name: "Rapid7",                url: "https://blog.rapid7.com/rss/",                                       category: "vulnerabilities",     priority: "normal" },
  { name: "Check Point Research",  url: "https://research.checkpoint.com/feed/",                              category: "threat_intelligence", priority: "normal" },
  { name: "Huntress",              url: "https://www.huntress.com/blog/rss.xml",                              category: "incident_response",   priority: "normal" },
  { name: "GreyNoise",             url: "https://www.greynoise.io/blog/rss.xml",                              category: "threat_intelligence", priority: "normal" },
  { name: "Trail of Bits",         url: "https://blog.trailofbits.com/feed/",                                 category: "bug_bounty_research", priority: "normal" },
  { name: "Tenable",               url: "https://www.tenable.com/blog/feed",                                  category: "vulnerabilities",     priority: "normal" },
  { name: "Qualys",                url: "https://blog.qualys.com/feed/",                                      category: "vulnerabilities",     priority: "normal" },
  { name: "HackerOne",             url: "https://www.hackerone.com/blog.rss",                                 category: "bug_bounty_research", priority: "normal" },
  { name: "PortSwigger Daily Swig",url: "https://portswigger.net/daily-swig/rss",                             category: "bug_bounty_research", priority: "normal" },

  // Individual / Substack
  { name: "Schneier on Security",  url: "https://www.schneier.com/feed/",                                     category: "policy_regulation",   priority: "high" },
  { name: "Troy Hunt",             url: "https://www.troyhunt.com/rss/",                                      category: "data_breaches",       priority: "high" },
  { name: "Daniel Miessler",       url: "https://danielmiessler.com/feed/",                                   category: "ai_security",         priority: "normal" },
  { name: "PortSwigger Research",  url: "https://portswigger.net/research/rss",                               category: "bug_bounty_research", priority: "high" },
  { name: "r/netsec",              url: "https://www.reddit.com/r/netsec.rss",                                category: "bug_bounty_research", priority: "normal" },
  { name: "r/cybersecurity",       url: "https://www.reddit.com/r/cybersecurity.rss",                        category: "breaking_threats",    priority: "normal" },
  { name: "r/AskNetsec",           url: "https://www.reddit.com/r/asknetsec.rss",                            category: "incident_response",   priority: "normal" },

  // Government / org
  { name: "CISA Advisories",       url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",             category: "policy_regulation",   priority: "high" },
  { name: "MSRC",                  url: "https://api.msrc.microsoft.com/update-guide/rss",                    category: "vulnerabilities",     priority: "high" },
  { name: "CERT-EU",               url: "https://cert.europa.eu/publications/security-advisories-rss",       category: "policy_regulation",   priority: "normal" },
  { name: "NCSC UK",               url: "https://www.ncsc.gov.uk/api/1/services/v1/all-rss-feed.xml",        category: "policy_regulation",   priority: "normal" },

  // Security tools — GitHub release feeds (active recon / pentest)
  { name: "trickest/collection",          url: "https://github.com/trickest/collection/releases.atom",             category: "security_tools", priority: "normal" },
  { name: "projectdiscovery/nuclei",      url: "https://github.com/projectdiscovery/nuclei/releases.atom",        category: "security_tools", priority: "normal" },
  { name: "ffuf/ffuf",                    url: "https://github.com/ffuf/ffuf/releases.atom",                      category: "security_tools", priority: "normal" },
  { name: "OJ/gobuster",                  url: "https://github.com/OJ/gobuster/releases.atom",                    category: "security_tools", priority: "normal" },
  { name: "projectdiscovery/httpx",       url: "https://github.com/projectdiscovery/httpx/releases.atom",         category: "security_tools", priority: "normal" },
  { name: "projectdiscovery/subfinder",   url: "https://github.com/projectdiscovery/subfinder/releases.atom",     category: "security_tools", priority: "normal" },
  { name: "zaproxy/zaproxy",              url: "https://github.com/zaproxy/zaproxy/releases.atom",                category: "security_tools", priority: "normal" },
  { name: "sqlmapproject/sqlmap",         url: "https://github.com/sqlmapproject/sqlmap/releases.atom",           category: "security_tools", priority: "normal" },
  { name: "rapid7/metasploit-framework",  url: "https://github.com/rapid7/metasploit-framework/releases.atom",    category: "security_tools", priority: "normal" },

  // Offense / red team
  { name: "Offensive Security",   url: "https://www.offsec.com/feed",                                        category: "offense_red_team",    priority: "normal" },
  { name: "Red Canary Blog",      url: "https://redcanary.com/blog/feed/",                                   category: "offense_red_team",    priority: "normal" },
  { name: "Outflank",             url: "https://www.outflank.nl/blog/feed/",                                 category: "offense_red_team",    priority: "normal" },
];

/**
 * Keyword rules: an article is routed into its feed's home category PLUS any
 * category whose keyword list matches title or summary (case-insensitive).
 */
export const KEYWORDS: KeywordRule[] = [
  { match: ["ransomware", "lockbit", "blackcat", "akira", "encrypt", "extortion"],
    routeTo: "breaking_threats" },
  { match: ["cve-", "0day", "zero-day", "rce ", "patch tuesday", "critical flaw", "actively exploited"],
    routeTo: "vulnerabilities" },
  { match: ["apt", "threat actor", "campaign", "attributed to", "chinese", "russian", "iranian", "north korean"],
    routeTo: "threat_intelligence" },
  { match: ["data breach", "leaked", "exposed database", "personal information of", "credentials dump"],
    routeTo: "data_breaches" },
  { match: ["phishing", "b ec ", "business email compromise", "scam", "social engineering"],
    routeTo: "phishing_fraud" },
  { match: ["aws ", "s3 bucket", "iam ", "azure ", "misconfig", "kubernetes", "gcp "],
    routeTo: "cloud_security" },
  { match: ["edr", "xdr", "siem", "detection rule", "yara", "sigma rule", "detection engineering"],
    routeTo: "network_endpoint" },
  { match: ["okta", "entra", "saml", "mfa ", "identity", "oauth", "federation"],
    routeTo: "identity_access" },
  { match: ["prompt injection", "llm attack", "ai red team", "model security", "genai"],
    routeTo: "ai_security" },
  { match: ["scada", "ot security", "ics ", "critical infrastructure", "plc "],
    routeTo: "ics_ot" },
  { match: ["cisa ", "eu ai act", "sec disclosure", "nis2", "regulation", "executive order"],
    routeTo: "policy_regulation" },
  { match: ["raises $", "raised $", "series a", "ipo", "acquired", "unveils", "launches"],
    routeTo: "vendor_product" },
  { match: ["reverse engineering", "malware analysis", "new family", "stealer", "loader"],
    routeTo: "malware_analysis" },
  { match: ["incident response", "forensics", "lessons learned", "post-mortem"],
    routeTo: "incident_response" },
  { match: ["bug bounty", "hackerone", "bugcrowd", "write-up", "research"],
    routeTo: "bug_bounty_research" },
  { match: ["red team", "offensive tradecraft", "c2 ", "command and control"],
    routeTo: "offense_red_team" },
  { match: ["crypto", "post-quantum", "pqc", "tls ", "cipher"],
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

/** Sector-relevant tickers (Stooq/Yahoo, silent-fail to {} on error). */
export const STOCK_TICKERS = ["CRWD", "PANW", "S", "FTNT", "ZS", "OKTA", "SNET"];
