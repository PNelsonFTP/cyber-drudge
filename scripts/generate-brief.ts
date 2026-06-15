import type { DailyBrief, HeadlinesPayload, TrendingStory } from "./types";

/**
 * scripts/generate-brief.ts
 * -------------------------
 * If ANTHROPIC_API_KEY is set, call Claude for a short daily brief with an
 * anti-hallucination system prompt. Otherwise build a curated brief from the
 * top trending story + lead + 1 article from up to 3 distinct categories.
 */

export async function generateBrief(payload: HeadlinesPayload): Promise<DailyBrief> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      const llm = await callClaude(key, payload);
      if (llm) return llm;
    } catch {
      // fall back to curated
    }
  }
  return curatedBrief(payload);
}

function curatedBrief(payload: HeadlinesPayload): DailyBrief {
  const bullets: string[] = [];
  const topTrending = payload.trending[0];
  if (topTrending) {
    bullets.push(
      `${topTrending.title} — covered by ${topTrending.sources.join(", ")}`
    );
  }
  if (payload.leadStory) {
    const ls = payload.leadStory;
    const also =
      ls.related.length > 0
        ? ` (also: ${ls.related.map((r) => r.source).slice(0, 3).join(", ")})`
        : "";
    bullets.push(`Lead: ${ls.title}${also}`);
  }
  const usedCats = new Set<string>();
  for (const cat of payload.categories) {
    if (usedCats.size >= 3) break;
    const a = cat.articles[0];
    if (!a || usedCats.has(cat.id)) continue;
    usedCats.add(cat.id);
    bullets.push(`${cat.label}: ${a.title}`);
  }
  const headline =
    topTrending?.title ?? payload.leadStory?.title ?? "Cybersecurity news today";
  return {
    generatedAt: Date.now(),
    source: "curated",
    headline,
    bullets: bullets.slice(0, 6),
  };
}

async function callClaude(
  apiKey: string,
  payload: HeadlinesPayload
): Promise<DailyBrief | null> {
  const trendSummary: TrendingStory[] = payload.trending.slice(0, 8);
  const catSummary = payload.categories
    .filter((c) => c.articles.length > 0)
    .map((c) => ({
      cat: c.label,
      top: c.articles.slice(0, 3).map((a) => ({ t: a.title, s: a.source })),
    }));
  const context = JSON.stringify({
    trend: trendSummary,
    lead: payload.leadStory,
    cats: catSummary,
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 600,
      system:
        "You summarize cybersecurity news for a dense Drudge-Report-style site. " +
        "You MUST NOT invent stories, sources, quotes, CVE IDs, dollar figures, or dates. " +
        "Only summarize items present in the user-provided JSON. " +
        'Return strict JSON: {"headline": string, "bullets": string[]}. ' +
        "Headline <= 90 chars. 3-6 bullets, each <= 140 chars.",
      messages: [
        { role: "user", content: `Summarize today's cybersecurity news.\n\n${context}` },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = json.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as { headline?: string; bullets?: string[] };
  if (!parsed.headline || !Array.isArray(parsed.bullets)) return null;
  return {
    generatedAt: Date.now(),
    source: "llm",
    headline: parsed.headline.slice(0, 120),
    bullets: parsed.bullets.slice(0, 8),
  };
}
