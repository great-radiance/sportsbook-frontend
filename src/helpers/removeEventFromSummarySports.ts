import type { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import type { LiveSidebarStoreSport } from "@/api/sidebar/apiGetLiveSidebar";
import {
  countsSummarySportsState,
  summarySportsLiveState,
  summarySportsState,
} from "@/state/summarySports";
import { storeState } from "@/state/storeState";
import { MatchDataResponse } from "@/api/matches/apiGetMatchData";
import {
  findLeagueInRegion,
  findRegionNode,
  findSportNode,
} from "@/helpers/findSidebarNodeByRoute";

const EVENT_ID_ARRAY_KEYS = [
  "pre",
  "live",
  "outright",
  "bbPre",
  "bbLive",
] as const;

type EventBucket = "pre" | "live" | "outright";

const nodeKey = (...parts: (string | number)[]) => parts.map(String).join("-");

function eventBucketFor(event: MatchDataResponse): EventBucket | null {
  const { isOutright, status } = event.eventInfo;
  if (isOutright) return "outright";
  if (status === 3) return "live";
  if (status === 1 || status === 2) return "pre";
  return null;
}

function matchesRegionId(node: sidebarNode, regionId: number): boolean {
  if (node.type === "region") return node.regionId === regionId;
  if (node.type === "combined_region") {
    return nodeKey(...(node.regionIds ?? [])) === String(regionId);
  }
  return false;
}

function matchesLeagueId(node: sidebarNode, leagueId: number): boolean {
  if (node.type === "league") return node.leagueId === leagueId;
  if (node.type === "combined_league") {
    return nodeKey(...(node.leagueIds ?? [])) === String(leagueId);
  }
  return false;
}

function isLeagueNode(node: sidebarNode): boolean {
  return node.type === "league" || node.type === "combined_league";
}

function appendEventId(ids: number[] | undefined, eventId: number): number[] {
  const list = ids ?? [];
  return list.includes(eventId) ? list : [...list, eventId];
}

function leagueExistsInSidebar(
  sportId: number,
  regionId: number,
  leagueId: number,
): boolean {
  const sportNode = findSportNode(summarySportsState.value, String(sportId));
  if (!sportNode?.children?.length) return false;

  const regionNode = findRegionNode(sportNode.children, String(regionId));
  if (regionNode && findLeagueInRegion(regionNode, String(leagueId))) {
    return true;
  }

  return sportNode.children.some(
    (node) =>
      isLeagueNode(node) &&
      matchesLeagueId(node, leagueId) &&
      node.region?.id === regionId,
  );
}

function addEventToLeagueNodes(
  nodes: sidebarNode[],
  regionId: number,
  leagueId: number,
  eventId: number,
  bucket: EventBucket,
): { nodes: sidebarNode[]; added: boolean } {
  let added = false;

  const next = nodes.map((node) => {
    if (node.type === "custom_region") {
      const result = addEventToLeagueNodes(
        node.children ?? [],
        regionId,
        leagueId,
        eventId,
        bucket,
      );
      if (result.added) added = true;
      return { ...node, children: result.nodes };
    }

    if (matchesRegionId(node, regionId)) {
      const children = (node.children ?? []).map((child) => {
        if (!matchesLeagueId(child, leagueId)) return child;
        const nextIds = appendEventId(child[bucket], eventId);
        if (nextIds.length > (child[bucket]?.length ?? 0)) added = true;
        return { ...child, [bucket]: nextIds };
      });
      return { ...node, children };
    }

    if (
      isLeagueNode(node) &&
      matchesLeagueId(node, leagueId) &&
      node.region?.id === regionId
    ) {
      const nextIds = appendEventId(node[bucket], eventId);
      if (nextIds.length > (node[bucket]?.length ?? 0)) added = true;
      return { ...node, [bucket]: nextIds };
    }

    return node;
  });

  return { nodes: next, added };
}

function addEventToPrematchSidebar(
  sportId: number,
  regionId: number,
  leagueId: number,
  eventId: number,
  bucket: EventBucket,
): boolean {
  if (!leagueExistsInSidebar(sportId, regionId, leagueId)) return false;

  let added = false;
  summarySportsState.value = summarySportsState.value.map((node) => {
    if (node.type === "sport" && node.sportId === sportId) {
      const result = addEventToLeagueNodes(
        node.children ?? [],
        regionId,
        leagueId,
        eventId,
        bucket,
      );
      if (result.added) added = true;
      return { ...node, children: result.nodes };
    }
    if (node.type === "combined_sport" && sportId === 0) {
      const result = addEventToLeagueNodes(
        node.children ?? [],
        regionId,
        leagueId,
        eventId,
        bucket,
      );
      if (result.added) added = true;
      return { ...node, children: result.nodes };
    }
    return node;
  });

  return added;
}

function addEventToLiveSidebar(
  sportId: number,
  regionId: number,
  leagueId: number,
  eventId: number,
): boolean {
  let added = false;

  summarySportsLiveState.value = summarySportsLiveState.value.map((sport) => {
    if (sport.id !== sportId) return sport;

    return {
      ...sport,
      regions: sport.regions.map((region) => {
        if (region.id !== regionId) return region;

        return {
          ...region,
          leagues: region.leagues.map((league) => {
            if (league.id !== leagueId) return league;
            const events = appendEventId(league.events, eventId);
            if (events.length > league.events.length) added = true;
            return { ...league, events };
          }),
        };
      }),
    };
  });

  return added;
}

function incrementSummaryCounts(
  event: MatchDataResponse,
  sportId: number,
): void {
  const counts = countsSummarySportsState.value;

  if (event.eventInfo.isOutright) {
    const existing = counts.outrightCount.counts[sportId];
    countsSummarySportsState.value = {
      ...counts,
      outrightCount: {
        ...counts.outrightCount,
        counts: {
          ...counts.outrightCount.counts,
          [sportId]: {
            count: (existing?.count ?? 0) + 1,
            name: event.eventInfo.sport.name,
          },
        },
        totalCount: counts.outrightCount.totalCount + 1,
      },
    };
    return;
  }

  if (event.eventInfo.status === 1 || event.eventInfo.status === 2) {
    countsSummarySportsState.value = {
      ...counts,
      preMatchCount: {
        counts: {
          ...counts.preMatchCount.counts,
          [sportId]: (counts.preMatchCount.counts[sportId] ?? 0) + 1,
        },
        totalCount: counts.preMatchCount.totalCount + 1,
      },
    };
    return;
  }

  if (event.eventInfo.status === 3) {
    countsSummarySportsState.value = {
      ...counts,
      liveCount: {
        counts: {
          ...counts.liveCount.counts,
          [sportId]: (counts.liveCount.counts[sportId] ?? 0) + 1,
        },
        totalCount: counts.liveCount.totalCount + 1,
      },
    };
  }
}

function stripEventIdFromSidebarNodes(
  nodes: sidebarNode[],
  eventId: number,
): sidebarNode[] {
  return nodes.map((node) => {
    const next: sidebarNode = { ...node };

    for (const key of EVENT_ID_ARRAY_KEYS) {
      const ids = next[key];
      if (ids?.includes(eventId)) {
        next[key] = ids.filter((id) => id !== eventId);
      }
    }

    if (next.children?.length) {
      next.children = stripEventIdFromSidebarNodes(next.children, eventId);
    }

    return next;
  });
}

function stripEventIdFromLiveSports(
  sports: LiveSidebarStoreSport[],
  eventId: number,
): LiveSidebarStoreSport[] {
  return sports.map((sport) => ({
    ...sport,
    regions: sport.regions.map((region) => ({
      ...region,
      leagues: region.leagues.map((league) => ({
        ...league,
        events: league.events.filter((id) => id !== eventId),
      })),
    })),
  }));
}

export function removeEventFromSummarySports(eventId: number): void {
  if (!Number.isFinite(eventId)) return;

  summarySportsState.value = stripEventIdFromSidebarNodes(
    summarySportsState.value,
    eventId,
  );
  summarySportsLiveState.value = stripEventIdFromLiveSports(
    summarySportsLiveState.value,
    eventId,
  );
  const event = storeState.value[eventId];
  if (event) {
    if (event.value.isOutright) {
      countsSummarySportsState.value.outrightCount.counts[
        event.value.sport.id
      ] = {
        count:
          countsSummarySportsState.value.outrightCount.counts[
            event.value.sport.id
          ].count - 1,
        name: event.value.sport.name,
      };
    } else if (event.value.status === 1 || event.value.status === 2) {
      countsSummarySportsState.value.preMatchCount.counts[
        event.value.sport.id
      ]--;
      countsSummarySportsState.value.preMatchCount.totalCount--;
    } else if (event.value.status === 3) {
      countsSummarySportsState.value.liveCount.counts[event.value.sport.id]--;
      countsSummarySportsState.value.liveCount.totalCount--;
    }
  }
}
export function addEventToSummarySports(event: MatchDataResponse): void {
  const eventId = event.eventInfo.id;
  const sportId = event.eventInfo.sport.id;
  const regionId = event.eventInfo.country.id;
  const leagueId = event.eventInfo.competition.id;
  const bucket = eventBucketFor(event);
  if (!bucket) return;

  let added = false;

  if (bucket === "live") {
    added = addEventToLiveSidebar(sportId, regionId, leagueId, eventId);
  }

  added =
    addEventToPrematchSidebar(
      sportId,
      regionId,
      leagueId,
      eventId,
      bucket,
    ) || added;

  if (added) {
    incrementSummaryCounts(event, sportId);
  }
}
