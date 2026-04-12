import { orderConfigState } from "@/state/orderConfigState";
import { rankedLeagueState } from "@/state/rankedLeagueState";
type LeagueRow = {
  league: string;
  sport: string;
  region: string;
  order: number;
};

type LeagueConfig = {
  order: number;
  enabled: boolean;
};

type RegionConfig = {
  order: number;
  enabled: boolean;
  leagues: Record<string, LeagueConfig>;
};

type SportConfig = {
  order: number;
  enabled: boolean;
  regions: Record<string, RegionConfig>;
};

type ConfigTree = Record<string, SportConfig>;

type FallbackOrders = {
  regions?: Record<string, number>;
  leagues?: Record<string, number>;
};

/**
 * Creates a ranked league array from config.
 *
 * Ranking rule:
 * sport.order ASC
 * -> region.order ASC
 * -> league.order ASC
 *
 * If a league is missing order in config, fallbackLeagues[league] is used.
 * If a region has no leagues and includeRegionPlaceholders=true,
 *   a placeholder row is generated using "__REGION__".
 */
export function useOrderConfig(options?: {
  includeRegionPlaceholders?: boolean;
  fallback?: Record<string, FallbackOrders>; // keyed by sport
}) {
  const includeRegionPlaceholders = options?.includeRegionPlaceholders ?? false;
  const fallback = options?.fallback ?? {};

  const rows: LeagueRow[] = [];

  const sports = Object.entries(orderConfigState.value)
    .filter(([, sportCfg]) => sportCfg?.enabled)
    .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]));

  for (const [sport, sportCfg] of sports) {
    const sportFallback = fallback[sport] ?? {};
    const regionFallback = sportFallback.regions ?? {};
    const leagueFallback = sportFallback.leagues ?? {};

    const regions = Object.entries(sportCfg.regions ?? {})
      .filter(([, regionCfg]) => regionCfg?.enabled)
      .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]));

    for (const [region, regionCfg] of regions) {
      const leagues = Object.entries(regionCfg.leagues ?? {})
        .filter(([, leagueCfg]) => leagueCfg?.enabled)
        .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]));

      if (leagues.length > 0) {
        for (const [league, leagueCfg] of leagues) {
          rows.push({
            league,
            sport,
            region,
            order:
              sportCfg.order * 1_000_000 +
              regionCfg.order * 1_000 +
              leagueCfg.order,
          });
        }
      } else if (includeRegionPlaceholders) {
        // Optional: emit placeholder when region has no configured leagues
        const fallbackRegionOrder = regionFallback[region] ?? regionCfg.order;
        rows.push({
          league: "__REGION__",
          sport,
          region,
          order: sportCfg.order * 1_000_000 + fallbackRegionOrder * 1_000,
        });
      }
    }
  }

  const orderedRows = rows.sort(
    (a, b) => a.order - b.order || a.league.localeCompare(b.league),
  );
  rankedLeagueState.value = orderedRows;
  console.log(`====rankedLeagueState`, rankedLeagueState.value);
}
