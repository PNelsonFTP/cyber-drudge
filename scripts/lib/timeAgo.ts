/**
 * scripts/lib/timeAgo.ts
 * ----------------------
 * Parses arbitrary feed date strings into a ms epoch. We need to handle 9
 * distinct formats because feeds are wild:
 *   1. "<N> <unit> ago"           ("3 hours ago")
 *   2. "Last week" / "Yesterday"  (relative words)
 *   3. RFC822                     ("Fri, 14 Jun 2025 10:00:00 GMT")
 *   4. ISO 8601                   ("2025-06-14T10:00:00Z")
 *   5. Day-first "12 Jun 2025"
 *   6. Slash dates "06/14/2025"
 *   7. Compact URL date "/20250614/"
 *   8. Month + day no year        ("June 14")
 *   9. Bare epoch ms              ("1718345600000")
 *
 * On total parse failure we return Date.now() so the item still shows up.
 */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

export function parseFeedDate(raw: string | undefined | null): number {
  if (!raw) return Date.now();
  const input = raw.trim();
  if (!input) return Date.now();
  const now = Date.now();
  const lower = input.toLowerCase();

  // 1. "<N> <unit> ago"
  const ago = lower.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/);
  if (ago) {
    const n = parseInt(ago[1], 10);
    const unit = ago[2];
    const mult: Record<string, number> = {
      second: 1000,
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
      month: 2_592_000_000,
      year: 31_536_000_000,
    };
    return now - n * (mult[unit] ?? 0);
  }

  // 2. Relative words
  if (/\byesterday\b/.test(lower)) return now - 86_400_000;
  if (/\blast\s*week\b/.test(lower)) return now - 604_800_000;
  if (/\blast\s*month\b/.test(lower)) return now - 2_592_000_000;
  if (/\btoday\b/.test(lower)) return now;

  // 7. Compact URL date /20250614/
  const compact = input.match(/\/(\d{4})(\d{2})(\d{2})\//);
  if (compact) {
    const d = new Date(Date.UTC(+compact[1], +compact[2] - 1, +compact[3]));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 4. ISO 8601
  const iso = input.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/);
  if (iso) {
    const d = new Date(iso[0]);
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 3. RFC822
  const rfc = input.match(/,\s*\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2}(:\d{2})?\s*[A-Z]+/);
  if (rfc) {
    const d = new Date(input.replace(/^[^,]+,\s*/, ""));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 5. Day-first "12 Jun 2025" (or "12 June 2025")
  const dayFirst = input.match(/\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/);
  if (dayFirst && MONTHS[dayFirst[2].toLowerCase()] !== undefined) {
    const d = new Date(Date.UTC(+dayFirst[3], MONTHS[dayFirst[2].toLowerCase()], +dayFirst[1]));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 6. Slash dates "06/14/2025" (assume US month/day/year)
  const slash = input.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slash) {
    const d = new Date(Date.UTC(+slash[3], +slash[1] - 1, +slash[2]));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 8. Month + day no year ("June 14")
  const mdNoYear = input.match(/\b([A-Za-z]+)\s+(\d{1,2})\b/);
  if (mdNoYear && MONTHS[mdNoYear[1].toLowerCase()] !== undefined) {
    const d = new Date(Date.UTC(new Date().getUTCFullYear(), MONTHS[mdNoYear[1].toLowerCase()], +mdNoYear[2]));
    if (!isNaN(d.getTime())) return d.getTime();
  }

  // 9. Bare epoch ms
  if (/^\d{12,13}$/.test(input)) {
    const n = parseInt(input, 10);
    return n;
  }

  // Last resort: let Date have it.
  const fallback = new Date(input);
  return isNaN(fallback.getTime()) ? now : fallback.getTime();
}
