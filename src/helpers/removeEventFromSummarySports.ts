import type { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import type { LiveSidebarStoreSport } from "@/api/sidebar/apiGetLiveSidebar";
import {
  countsSummarySportsState,
  summarySportsLiveState,
  summarySportsState,
} from "@/state/summarySports";
import { storeState } from "@/state/storeState";

const EVENT_ID_ARRAY_KEYS = [
  "pre",
  "live",
  "outright",
  "bbPre",
  "bbLive",
] as const;

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
