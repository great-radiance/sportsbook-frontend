import type { MarketNavOption } from "@/app/components/marketNavigation";
import type { SidebarMarketRef } from "@/state/summarySports";

/** Sport ids that use the moneyline match layout. */
export const MONEYLINE_SPORT_IDS = new Set([8, 6, 7, 14]);

export function isMoneylineSport(sportId: number, sportName?: string): boolean {
  return (
    MONEYLINE_SPORT_IDS.has(sportId) || /hockey/i.test(sportName ?? "")
  );
}

export function marketTabSortKey(ref: SidebarMarketRef): number {
  const orders = ref.groups?.map((g) => g.order) ?? [];
  if (!orders.length) return ref.id;
  const nonZero = orders.filter((o) => o > 0);
  if (nonZero.length) return Math.min(...nonZero);
  return 1_000_000;
}

export function marketOptionsFromRef(
  refs: SidebarMarketRef[] | undefined,
): MarketNavOption[] {
  if (!refs?.length) return [];
  return refs
    .slice()
    .sort((a, b) => {
      const orderDiff = marketTabSortKey(a) - marketTabSortKey(b);
      if (orderDiff !== 0) return orderDiff;
      return a.id - b.id;
    })
    .map((m) => ({ id: m.id, label: m.name }));
}

export function eventHasMarketType(
  event: unknown,
  marketType: number,
): boolean {
  const markets = (
    event as { markets?: Record<string, { value?: { type?: number } }> }
  )?.markets;
  if (!markets) return false;
  return Object.values(markets).some((sig) => sig?.value?.type === marketType);
}

export function filterMarketOptionsByEvents(
  options: MarketNavOption[],
  loadedEvents: unknown[],
): MarketNavOption[] {
  if (!options.length || !loadedEvents.length) return [];
  return options.filter((opt) =>
    loadedEvents.some((ev) => eventHasMarketType(ev, opt.id)),
  );
}

export function liveMatchWouldRender(
  event: unknown,
  marketType: number,
  allowAutoSelect: boolean,
): boolean {
  const e = event as {
    markets?: Record<string, { value?: { type?: number; id?: number } }>;
  };
  if (!e?.markets) return false;
  const markets = Object.values(e.markets).map((sig) => sig?.value);
  if (!markets.length) return false;
  if (markets.find((m) => m?.type === marketType)?.id) return true;
  return allowAutoSelect && !!markets[0]?.id;
}

export function eventsFromStoreByIds(
  eventIds: number[],
  getEvent: (id: number) => unknown | undefined,
): unknown[] {
  return eventIds.map((id) => getEvent(id)).filter(Boolean);
}
