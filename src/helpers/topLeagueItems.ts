import type {
  SidebarFeaturedLeagueRow,
  summaryData,
} from "@/state/summarySports";
import { buildPrematchPath } from "@/helpers/buildPrematchPath";

export type TopLeagueItem = {
  sport: { id: number; name: string };
  region: { id: number; name: string };
  league: { id: number; name: string };
  path: string;
};

const NAMED_SPORT_LIMITS: Record<string, number> = {
  soccer: 8,
  football: 8,
  basketball: 3,
  tennis: 3,
  "ice hockey": 2,
};

/** Shared budget for everything not in `NAMED_SPORT_LIMITS`. */
const OTHER_SPORTS_TOTAL_BUDGET = 4;

function sportKey(sportName: string): string {
  return sportName.trim().toLowerCase();
}

type SportNode = {
  id: number;
  name: string;
  regions: RegionNode[];
  regionById: Map<number, RegionNode>;
  leagueById: Map<number, { regionId: number; name: string }>;
};

type RegionNode = {
  id: number;
  name: string;
  leagues: { id: number; name: string }[];
};

function indexSummary(summary: summaryData): Map<number, SportNode> {
  const out = new Map<number, SportNode>();
  for (const sport of summary.data ?? []) {
    const sportId = sport[0] as number;
    const sportName = String(sport[1] ?? "").trim();
    if (!sportName) continue;
    const node: SportNode = {
      id: sportId,
      name: sportName,
      regions: [],
      regionById: new Map(),
      leagueById: new Map(),
    };
    for (const region of sport[2] ?? []) {
      const regionId = region[0] as number;
      const regionName = String(region[1] ?? "").trim();
      if (!regionName) continue;
      const regionNode: RegionNode = {
        id: regionId,
        name: regionName,
        leagues: [],
      };
      for (const league of region[2] ?? []) {
        const leagueId = league[0] as number;
        const leagueName = String(league[1] ?? "").trim();
        const eventIds = league[2];
        if (!leagueName || !Array.isArray(eventIds) || eventIds.length === 0) {
          continue;
        }
        regionNode.leagues.push({ id: leagueId, name: leagueName });
        node.leagueById.set(leagueId, {
          regionId,
          name: leagueName,
        });
      }
      if (regionNode.leagues.length === 0) continue;
      node.regions.push(regionNode);
      node.regionById.set(regionId, regionNode);
    }
    if (node.regions.length === 0) continue;
    out.set(sportId, node);
  }
  return out;
}

function itemFromIds(
  sport: SportNode,
  regionId: number,
  leagueId: number,
  leagueName: string,
): TopLeagueItem | null {
  const region = sport.regionById.get(regionId);
  if (!region) return null;
  return {
    sport: { id: sport.id, name: sport.name },
    region: { id: region.id, name: region.name },
    league: { id: leagueId, name: leagueName },
    path: buildPrematchPath(
      sport.name,
      sport.id,
      region.name,
      region.id,
      leagueName,
      leagueId,
    ),
  };
}

/** Stateful picker: featured rows first, then summary regions (one league per region). */
type LeaguePicker = {
  next: () => TopLeagueItem | null;
};

function createLeaguePicker(
  sport: SportNode,
  featuredRows: SidebarFeaturedLeagueRow[],
): LeaguePicker {
  const addedLeagueIds = new Set<number>();
  const addedRegionIds = new Set<number>();
  let featuredIdx = 0;
  let regionIdx = 0;

  const pickFromFeatured = (): TopLeagueItem | null => {
    while (featuredIdx < featuredRows.length) {
      const row = featuredRows[featuredIdx++];
      const leagueId = row[0] as number;
      if (addedLeagueIds.has(leagueId)) continue;
      const rowRegionId = row[4] as number | undefined;
      const fromIndex = sport.leagueById.get(leagueId);
      const regionId = fromIndex?.regionId ?? rowRegionId ?? null;
      if (regionId == null) continue;
      const leagueName =
        fromIndex?.name ?? String(row[1] ?? "").trim();
      if (!leagueName) continue;
      const item = itemFromIds(sport, regionId, leagueId, leagueName);
      if (!item) continue;
      addedLeagueIds.add(leagueId);
      addedRegionIds.add(regionId);
      return item;
    }
    return null;
  };

  const pickFromSummary = (): TopLeagueItem | null => {
    while (regionIdx < sport.regions.length) {
      const region = sport.regions[regionIdx++];
      if (addedRegionIds.has(region.id)) continue;
      const league = region.leagues[0];
      if (!league || addedLeagueIds.has(league.id)) continue;
      const item = itemFromIds(sport, region.id, league.id, league.name);
      if (!item) continue;
      addedLeagueIds.add(league.id);
      addedRegionIds.add(region.id);
      return item;
    }
    return null;
  };

  return {
    next: () => pickFromFeatured() ?? pickFromSummary(),
  };
}

/**
 * Sidebar "famous" leagues first (curated by the API), then top up from the
 * summary tree picking at most one league per region.
 *
 * Caps: soccer 8, basketball 3, tennis 3, ice hockey 2, everything else
 * shares a `4` budget (round-robin across other sports). Total ≤ 20.
 */
export function buildTopLeagueItems(
  summary: summaryData,
  featuredBySport:
    | Record<number, SidebarFeaturedLeagueRow[]>
    | undefined,
): TopLeagueItem[] {
  const sports = indexSummary(summary);
  if (sports.size === 0) return [];

  const out: TopLeagueItem[] = [];
  const otherPickers: LeaguePicker[] = [];

  for (const sport of sports.values()) {
    const limit = NAMED_SPORT_LIMITS[sportKey(sport.name)];
    const picker = createLeaguePicker(
      sport,
      featuredBySport?.[sport.id] ?? [],
    );

    if (limit == null) {
      otherPickers.push(picker);
      continue;
    }

    for (let i = 0; i < limit; i++) {
      const item = picker.next();
      if (!item) break;
      out.push(item);
    }
  }

  let budget = OTHER_SPORTS_TOTAL_BUDGET;
  while (budget > 0 && otherPickers.length > 0) {
    let progressedThisPass = false;
    for (let i = 0; i < otherPickers.length && budget > 0; i++) {
      const item = otherPickers[i].next();
      if (!item) continue;
      out.push(item);
      budget--;
      progressedThisPass = true;
    }
    if (!progressedThisPass) break;
  }

  return out;
}
