import type { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import { buildPrematchPath } from "@/helpers/buildPrematchPath";

export type TopLeagueItem = {
  sport: { id: number; name: string };
  region: { id: number; name: string };
  league: { id: number; name: string };
  path: string;
};

type FeaturedRow = [
  leagueId: number,
  leagueName: string,
  unknown?,
  unknown?,
  regionId?: number,
  sportId?: number,
];

const NAMED_SPORT_LIMITS: Record<string, number> = {
  soccer: 8,
  football: 8,
  basketball: 3,
  tennis: 3,
  "ice hockey": 2,
};

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

function indexSidebarSports(nodes: sidebarNode[]): Map<number, SportNode> {
  const out = new Map<number, SportNode>();

  for (const root of nodes) {
    if (root.type !== "sport" && root.type !== "combined_sport") continue;

    const sportId = root.type === "combined_sport" ? 0 : (root.sportId ?? 0);
    const sportName = root.name?.trim() ?? "";
    if (!sportName) continue;

    const sport: SportNode = {
      id: sportId,
      name: sportName,
      regions: [],
      regionById: new Map(),
      leagueById: new Map(),
    };

    const walk = (
      children: sidebarNode[] | undefined,
      activeRegion?: { id: number; name: string },
    ) => {
      for (const node of children ?? []) {
        if (node.type === "custom_region") {
          walk(node.children);
          continue;
        }

        if (node.type === "region") {
          const regionId = node.regionId ?? 0;
          const regionName = node.name?.trim() ?? "";
          if (!regionId || !regionName) continue;

          let regionNode = sport.regionById.get(regionId);
          if (!regionNode) {
            regionNode = { id: regionId, name: regionName, leagues: [] };
            sport.regions.push(regionNode);
            sport.regionById.set(regionId, regionNode);
          }

          walk(node.children, { id: regionId, name: regionName });
          continue;
        }

        if (node.type === "combined_region") {
          const regionId = node.regionIds?.[0] ?? 0;
          const regionName = node.name?.trim() ?? "";
          walk(
            node.children,
            regionId
              ? { id: regionId, name: regionName }
              : activeRegion,
          );
          continue;
        }

        if (node.type !== "league") continue;

        const leagueId = node.leagueId ?? 0;
        const leagueName = node.name?.trim() ?? "";
        const pre = node.pre?.length ?? 0;
        if (!leagueId || !leagueName || pre === 0) continue;

        const regionId = node.region?.id ?? activeRegion?.id;
        const regionName =
          node.region?.name?.trim() ?? activeRegion?.name ?? "";
        if (regionId == null || !regionName) continue;

        let regionNode = sport.regionById.get(regionId);
        if (!regionNode) {
          regionNode = { id: regionId, name: regionName, leagues: [] };
          sport.regions.push(regionNode);
          sport.regionById.set(regionId, regionNode);
        }

        regionNode.leagues.push({ id: leagueId, name: leagueName });
        sport.leagueById.set(leagueId, { regionId, name: leagueName });
      }
    };

    walk(root.children);
    if (sport.regions.length > 0) out.set(sportId, sport);
  }

  return out;
}

function featuredRowsBySport(
  nodes: sidebarNode[],
  sports: Map<number, SportNode>,
): Record<number, FeaturedRow[]> {
  const featuredNode = nodes.find((node) => node.type === "featured_leagues");
  const bySport: Record<number, FeaturedRow[]> = {};

  for (const child of featuredNode?.children ?? []) {
    if (child.type !== "league") continue;

    const leagueId = child.leagueId ?? 0;
    const leagueName = child.name?.trim() ?? "";
    if (!leagueId || !leagueName) continue;

    let sportId: number | undefined;
    let regionId = child.region?.id;

    for (const sport of sports.values()) {
      const indexed = sport.leagueById.get(leagueId);
      if (!indexed) continue;
      sportId = sport.id;
      regionId = regionId ?? indexed.regionId;
      break;
    }

    if (sportId == null || regionId == null) continue;

    (bySport[sportId] ??= []).push([
      leagueId,
      leagueName,
      0,
      0,
      regionId,
      sportId,
    ]);
  }

  return bySport;
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

type LeaguePicker = {
  next: () => TopLeagueItem | null;
};

function createLeaguePicker(
  sport: SportNode,
  featuredRows: FeaturedRow[],
): LeaguePicker {
  const addedLeagueIds = new Set<number>();
  const addedRegionIds = new Set<number>();
  let featuredIdx = 0;
  let regionIdx = 0;

  const pickFromFeatured = (): TopLeagueItem | null => {
    while (featuredIdx < featuredRows.length) {
      const row = featuredRows[featuredIdx++];
      const leagueId = row[0];
      if (addedLeagueIds.has(leagueId)) continue;

      const fromIndex = sport.leagueById.get(leagueId);
      const regionId = fromIndex?.regionId ?? row[4] ?? null;
      if (regionId == null) continue;

      const leagueName = fromIndex?.name ?? String(row[1] ?? "").trim();
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

export function buildTopLeagueItems(nodes: sidebarNode[]): TopLeagueItem[] {
  const sports = indexSidebarSports(nodes);
  if (sports.size === 0) return [];

  const featuredBySport = featuredRowsBySport(nodes, sports);
  const out: TopLeagueItem[] = [];
  const otherPickers: LeaguePicker[] = [];

  for (const sport of sports.values()) {
    const limit = NAMED_SPORT_LIMITS[sportKey(sport.name)];
    const picker = createLeaguePicker(sport, featuredBySport[sport.id] ?? []);

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
