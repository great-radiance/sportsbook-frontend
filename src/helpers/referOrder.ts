import {
  apiGetLeagueOrder,
  apiGetLiveMarketOrder,
  apiGetMarketOrder,
} from "@/api/refer/apiGetReferOrder";
import type { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

const leagueOrderInFlight = new Map<number, Promise<number[]>>();
const marketOrderInFlight = new Map<number, Promise<number[]>>();
const liveMarketOrderInFlight = new Map<number, Promise<number[]>>();

/** Index in refer order list → 1-based flex `order`; unknown ids sort last. */
export function cssOrderFromReferList(
  orderList: number[] | undefined,
  id: number | null | undefined,
  fallback = 999,
): number {
  if (id == null || !Number.isFinite(id)) return fallback;
  if (!orderList?.length) return fallback;
  const index = orderList.indexOf(id);
  return index >= 0 ? index + 1 : fallback;
}

export function leagueNodeNumericId(node: sidebarNode): number | null {
  if (node.leagueId != null && Number.isFinite(Number(node.leagueId))) {
    return Number(node.leagueId);
  }
  if (node.leagueIds?.length) {
    const id = Number(node.leagueIds[0]);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function hasStoredOrder(
  store: Record<number, number[]>,
  sportId: number,
): boolean {
  return Object.prototype.hasOwnProperty.call(store, sportId);
}

export async function ensureLeagueOrder(sportId: number): Promise<number[]> {
  if (!sportId) return [];
  if (hasStoredOrder(sportsbookStore.leagueOrderBySportState.value, sportId)) {
    return sportsbookStore.leagueOrderBySportState.value[sportId] ?? [];
  }

  const existing = leagueOrderInFlight.get(sportId);
  if (existing) return existing;

  const promise = apiGetLeagueOrder(sportId)
    .then((body) => {
      const order = Array.isArray(body.order) ? body.order : [];
      sportsbookStore.leagueOrderBySportState.value = {
        ...sportsbookStore.leagueOrderBySportState.value,
        [sportId]: order,
      };
      return order;
    })
    .catch((error) => {
      console.error("Failed to load league order:", error);
      sportsbookStore.leagueOrderBySportState.value = {
        ...sportsbookStore.leagueOrderBySportState.value,
        [sportId]: [],
      };
      return [];
    })
    .finally(() => {
      leagueOrderInFlight.delete(sportId);
    });

  leagueOrderInFlight.set(sportId, promise);
  return promise;
}

export async function ensureMarketOrder(sportId: number): Promise<number[]> {
  if (!sportId) return [];
  if (hasStoredOrder(sportsbookStore.marketOrderBySportState.value, sportId)) {
    return sportsbookStore.marketOrderBySportState.value[sportId] ?? [];
  }

  const existing = marketOrderInFlight.get(sportId);
  if (existing) return existing;

  const promise = apiGetMarketOrder(sportId)
    .then((body) => {
      const order = Array.isArray(body.order) ? body.order : [];
      sportsbookStore.marketOrderBySportState.value = {
        ...sportsbookStore.marketOrderBySportState.value,
        [sportId]: order,
      };
      return order;
    })
    .catch((error) => {
      console.error("Failed to load market order:", error);
      sportsbookStore.marketOrderBySportState.value = {
        ...sportsbookStore.marketOrderBySportState.value,
        [sportId]: [],
      };
      return [];
    })
    .finally(() => {
      marketOrderInFlight.delete(sportId);
    });

  marketOrderInFlight.set(sportId, promise);
  return promise;
}

export async function ensureLiveMarketOrder(sportId: number): Promise<number[]> {
  if (!sportId) return [];
  if (
    hasStoredOrder(sportsbookStore.liveMarketOrderBySportState.value, sportId)
  ) {
    return sportsbookStore.liveMarketOrderBySportState.value[sportId] ?? [];
  }

  const existing = liveMarketOrderInFlight.get(sportId);
  if (existing) return existing;

  const promise = apiGetLiveMarketOrder(sportId)
    .then((body) => {
      const order = Array.isArray(body.order) ? body.order : [];
      sportsbookStore.liveMarketOrderBySportState.value = {
        ...sportsbookStore.liveMarketOrderBySportState.value,
        [sportId]: order,
      };
      return order;
    })
    .catch((error) => {
      console.error("Failed to load live market order:", error);
      sportsbookStore.liveMarketOrderBySportState.value = {
        ...sportsbookStore.liveMarketOrderBySportState.value,
        [sportId]: [],
      };
      return [];
    })
    .finally(() => {
      liveMarketOrderInFlight.delete(sportId);
    });

  liveMarketOrderInFlight.set(sportId, promise);
  return promise;
}
