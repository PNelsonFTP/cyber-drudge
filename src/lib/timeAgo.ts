/**
 * src/lib/timeAgo.ts
 * ------------------
 * Client-side "X minutes ago" formatter. Build-side parser lives in
 * scripts/lib/timeAgo.ts (handles feed date strings); this just formats
 * a ms epoch for human display.
 */
export function timeAgo(epoch: number): string {
  const diff = Date.now() - epoch;
  if (diff < 0) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

export function fullStamp(epoch: number): string {
  try {
    return new Date(epoch).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return "";
  }
}
