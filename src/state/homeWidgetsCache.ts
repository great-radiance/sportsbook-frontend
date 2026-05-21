import {
  apiGetStarPlayers,
  apiGetTrendingAccas,
  type StarPlayerCardResponse,
  type TrendingAccaCouponResponse,
} from "@/api/home/homeWidgets";
import { ensureEventsInStore } from "@/helpers/ensureEventsInStore";
import { getAppConfig } from "@/shared/config/appConfig";
import { signal } from "@preact/signals";

function collectHomeWidgetEventIds(
  starPlayers: StarPlayerCardResponse[],
  accas: TrendingAccaCouponResponse[],
): number[] {
  const ids: number[] = [];
  for (const card of starPlayers) {
    if (card.eventId > 0) ids.push(card.eventId);
    for (const pick of card.picks ?? []) {
      if (pick.eventId > 0) ids.push(pick.eventId);
    }
  }
  for (const acca of accas) {
    for (const leg of acca.legs ?? []) {
      if (leg.eventId > 0) ids.push(leg.eventId);
    }
  }
  return ids;
}

function collectHomeWidgetMarketTypeIds(
  starPlayers: StarPlayerCardResponse[],
  accas: TrendingAccaCouponResponse[],
): number[] {
  const ids: number[] = [];
  for (const card of starPlayers) {
    for (const pick of card.picks ?? []) {
      if (pick.marketId > 0) ids.push(pick.marketId);
    }
  }
  for (const acca of accas) {
    for (const leg of acca.legs ?? []) {
      if (leg.marketId > 0) ids.push(leg.marketId);
    }
  }
  return ids;
}

export const starPlayersCache = signal<StarPlayerCardResponse[] | null>(null);
export const trendingAccasCache = signal<TrendingAccaCouponResponse[] | null>(
  null,
);

export type HomeWidgetsLoadOptions = {
  sportId?: number;
  starLimit?: number;
  accaLimit?: number;
};

/** Loads both home widgets in parallel (integration guide). */
export async function loadHomeWidgetsBatch(
  options?: HomeWidgetsLoadOptions,
): Promise<void> {
  const { lang } = getAppConfig();
  const base = {
    lang: lang || "en",
    ...(options?.sportId != null ? { sportId: options.sportId } : {}),
  };

  const [starRes, accaRes] = await Promise.all([
    apiGetStarPlayers({ ...base, limit: options?.starLimit ?? 20 }),
    apiGetTrendingAccas({ ...base, limit: options?.accaLimit ?? 3 }),
  ]);

  const starPlayers = starRes?.data ?? [];
  const trendingAccas = accaRes?.data ?? [];

  await ensureEventsInStore(
    collectHomeWidgetEventIds(starPlayers, trendingAccas),
    {
      marketIds: collectHomeWidgetMarketTypeIds(starPlayers, trendingAccas),
    },
  );

  starPlayersCache.value = starPlayers;
  trendingAccasCache.value = trendingAccas;
}
