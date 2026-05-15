import type { summaryData } from "@/state/summarySports";
import type { FeaturedLeague } from "@/state/featuredLeaguesTypes";

/**
 * Build a small “featured leagues” map from the prematch sidebar summary tree
 * (no separate HTTP endpoint).
 */
export function buildFeaturedLeaguesFromSummary(
  summary: summaryData,
  maxLeagues = 24,
): FeaturedLeague {
  const out: FeaturedLeague = {};
  let added = 0;
  for (const sport of summary.data ?? []) {
    const sportName = String(sport[1] ?? "").trim();
    if (!sportName) continue;
    out[sportName] ??= {};
    for (const region of sport[2] ?? []) {
      const regionName = String(region[1] ?? "").trim();
      if (!regionName) continue;
      out[sportName][regionName] ??= [];
      for (const league of region[2] ?? []) {
        const leagueName = String(league[1] ?? "").trim();
        const ids = league[2];
        const n = Array.isArray(ids) ? ids.length : 0;
        if (!leagueName || n === 0) continue;
        const list = out[sportName][regionName];
        if (!list.includes(leagueName)) list.push(leagueName);
        added++;
        if (added >= maxLeagues) return out;
      }
    }
  }
  return out;
}
