// import type { SidebarMarketRef } from "@/state/summarySports";
import type { tMarketModel } from "@/types/typesForSocket.ts/tEventModel";

export type SidebarMarketRef = any;

export type EventMarketGroupTab = {
  id: number;
  name: string;
  order: number;
};

/** `order` 1, 2, 3… first; every `order === 0` group goes last. */
export function groupOrderRank(order: number): number {
  return order === 0 ? 1_000_000 : order;
}

export function compareGroupOrder(a: number, b: number): number {
  return groupOrderRank(a) - groupOrderRank(b);
}

function mergeGroupOrder(a: number, b: number): number {
  if (a === 0) return b;
  if (b === 0) return a;
  return Math.min(a, b);
}

/** `market.type` matches `marketsRef[].id`; group tab matches `marketsRef[].groups[].id`. */
export function marketBelongsToGroup(
  market: tMarketModel,
  marketsRef: SidebarMarketRef[] | null | undefined,
  groupId: number,
): boolean {
  // const ref = marketsRef?.find((r) => r.id === market.type);
  // return ref?.groups?.some((g) => g.id === groupId) ?? false;
  return false;
}

/**
 * Unique group tabs from event `marketsRef`, sorted by `order` (integration guide).
 * Omits groups with no matching markets on the event.
 */
export function collectMarketGroupTabs(
  marketsRef: SidebarMarketRef[] | null | undefined,
  markets: tMarketModel[],
): EventMarketGroupTab[] {
  const byId = new Map<number, EventMarketGroupTab>();

  // for (const ref of marketsRef ?? []) {
  //   for (const group of ref.groups ?? []) {
  //     const existing = byId.get(group.id);
  //     if (!existing) {
  //       byId.set(group.id, {
  //         id: group.id,
  //         name: group.name,
  //         order: group.order,
  //       });
  //     } else {
  //       existing.order = mergeGroupOrder(existing.order, group.order);
  //     }
  //   }
  // }

  return [...byId.values()].sort(
    (a, b) =>
      compareGroupOrder(a.order, b.order) || a.name.localeCompare(b.name),
  );
  // .filter((tab) =>
  //   markets.some((m) => marketBelongsToGroup(m, marketsRef, tab.id)),
  // );
}

function sortKeyForMarketType(
  marketType: number,
  marketsRef: SidebarMarketRef[],
  groupId?: number,
): number {
  // const refIndex = marketsRef.findIndex((r) => r.id === marketType);
  // if (refIndex < 0) return Number.MAX_SAFE_INTEGER;

  // const ref = marketsRef[refIndex]!;
  // if (groupId != null) {
  //   const group = ref.groups?.find((g) => g.id === groupId);
  //   const order = group?.order ?? Number.MAX_SAFE_INTEGER;
  //   return groupOrderRank(order) * 10_000 + refIndex;
  // }

  // const orders = ref.groups?.map((g) => g.order) ?? [];
  // const nonZero = orders.filter((o) => o > 0);
  // const order = nonZero.length
  //   ? Math.min(...nonZero)
  //   : orders.length
  //     ? 0
  //     : Number.MAX_SAFE_INTEGER;
  // return groupOrderRank(order) * 10_000 + refIndex;
  return 0;
}

/** Order markets by `groups[].order` on their `marketsRef` entry, then ref index. */
export function sortMarketsByMarketsRefOrder(
  markets: tMarketModel[],
  marketsRef?: SidebarMarketRef[] | null,
  groupId?: number,
): tMarketModel[] {
  // if (!marketsRef?.length) return markets;

  // return [...markets].sort(
  //   (a, b) =>
  //     sortKeyForMarketType(a.type, marketsRef, groupId) -
  //     sortKeyForMarketType(b.type, marketsRef, groupId),
  // );
  return [];
}

export function filterMarketsByGroupTab(
  markets: tMarketModel[],
  marketsRef: SidebarMarketRef[] | null | undefined,
  groupId: number,
): tMarketModel[] {
  return sortMarketsByMarketsRefOrder(
    markets.filter((m) => marketBelongsToGroup(m, marketsRef, groupId)),
    marketsRef,
    groupId,
  );
}
