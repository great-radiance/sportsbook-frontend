import { MarketInfoType } from "@/api/sidebar/apiGetSidebar";
import type { MarketNavOption } from "@/app/components/marketNavigation";
import { getAppConfig } from "@/shared/config/appConfig";
// import type { SidebarMarketRef } frm "@/state/summarySports";

/** Sport ids that use the moneyline match layout. */
export const MONEYLINE_SPORT_IDS = new Set([8, 6, 7, 14]);

export function isMoneylineSport(sportId: number, sportName?: string): boolean {
  return MONEYLINE_SPORT_IDS.has(sportId) || /hockey/i.test(sportName ?? "");
}

export function marketOptionsFromRef(
  refs: MarketInfoType[] | undefined,
): MarketNavOption[] {
  if (!refs?.length) return [];
  return refs.map((m) => ({
    id: m.type,
    label: m.translations[getAppConfig().lang] ?? "",
  }));
}

export function eventHasMarketType(
  event: unknown,
  marketType: number[] | number,
): boolean {
  const markets = (
    event as { markets?: Record<string, { value?: { type?: number } }> }
  )?.markets;
  if (!markets) return false;
  return Object.values(markets).some((sig) =>
    Array.isArray(marketType)
      ? marketType.includes(sig?.value?.type ?? 0)
      : sig?.value?.type === marketType,
  );
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
