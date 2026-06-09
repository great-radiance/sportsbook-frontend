import type { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import type { UpcomingBySportResponse } from "@/api/matches/apiGetUpcomingBySport";
import { storeEvent } from "@/helpers/storeEvent";

export type UpcomingLeagueEntry = {
  regionId: number;
  regionName: string;
  leagueId: number;
  leagueName: string;
  eventIds: number[];
};

const leagueOrderKey = (regionId: number, leagueId: number): string =>
  `${regionId}:${leagueId}`;

const isLeagueNode = (node: sidebarNode): boolean =>
  node.type === "league" || node.type === "combined_league";

/** Walk `summarySportsState` sport node to build region/league display order. */
export const buildSidebarLeagueOrder = (
  sportNode: sidebarNode | undefined,
): Map<string, number> => {
  const order = new Map<string, number>();
  let index = 0;

  const walk = (nodes: sidebarNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "custom_region") {
        walk(node.children);
        continue;
      }

      if (node.type === "region") {
        const regionId = node.regionId ?? 0;
        for (const child of node.children ?? []) {
          if (!isLeagueNode(child)) continue;
          order.set(leagueOrderKey(regionId, child.leagueId ?? 0), index++);
        }
        continue;
      }

      if (node.type === "combined_region") {
        const regionId = node.regionIds?.[0] ?? 0;
        for (const child of node.children ?? []) {
          if (!isLeagueNode(child)) continue;
          order.set(leagueOrderKey(regionId, child.leagueId ?? 0), index++);
        }
        continue;
      }

      if (isLeagueNode(node)) {
        order.set(leagueOrderKey(0, node.leagueId ?? 0), index++);
      }
    }
  };

  walk(sportNode?.children);
  return order;
};

export const sortUpcomingLeaguesBySidebar = (
  entries: UpcomingLeagueEntry[],
  sportNode: sidebarNode | undefined,
): UpcomingLeagueEntry[] => {
  const order = buildSidebarLeagueOrder(sportNode);
  return [...entries].sort((a, b) => {
    const orderA =
      order.get(leagueOrderKey(a.regionId, a.leagueId)) ??
      Number.MAX_SAFE_INTEGER;
    const orderB =
      order.get(leagueOrderKey(b.regionId, b.leagueId)) ??
      Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    const regionCmp = a.regionName.localeCompare(b.regionName);
    return regionCmp !== 0
      ? regionCmp
      : a.leagueName.localeCompare(b.leagueName);
  });
};

/** Store full events and return lightweight league rows with event ids only. */
export const extractUpcomingLeagueEntries = (
  response: UpcomingBySportResponse,
): UpcomingLeagueEntry[] => {
  const entries: UpcomingLeagueEntry[] = [];

  for (const region of response.regions ?? []) {
    for (const league of region.leagues ?? []) {
      const eventIds: number[] = [];
      for (const event of league.events ?? []) {
        if (
          event.markets.filter((market) => market.tradingStatus === 0)
            .length === 0
        )
          continue;
        storeEvent(event);
        eventIds.push(event.eventInfo.id);
      }
      if (eventIds.length === 0) continue;
      entries.push({
        regionId: region.id,
        regionName: region.name,
        leagueId: league.id,
        leagueName: league.name,
        eventIds,
      });
    }
  }

  return entries;
};
