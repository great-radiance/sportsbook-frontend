import { selectionStoreKey, selectionsStoreState } from "@/state/storeState";
import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";
import { signal } from "@preact/signals";

export type WidgetSportRef = { id: number; name: string };
export type WidgetRegionRef = { id: number; name: string };
export type WidgetLeagueRef = { id: number; name: string };
export type WidgetCompetitorRef = { id: number; name: string };

export type WidgetParamFields = {
  parameters?: Record<string, unknown> | null;
  extraParameters?: Record<string, unknown> | null;
  selectionExtraParameters?: Record<string, unknown> | null;
};

export type StarPlayerPickRole = "player_prop" | "match_result" | "total_goals";

export type StarPlayerPickResponse = WidgetParamFields & {
  role: StarPlayerPickRole;
  eventId: number;
  marketId: number;
  selectionId: number;
  marketName: string;
  outcomeName: string;
  odds: number;
};

export type BetBuilderHighlightPickResponse = WidgetParamFields & {
  slotIndex: number;
  label?: string;
  eventId: number;
  marketId: number;
  selectionId: number;
  marketName: string;
  outcomeName: string;
  odds: number;
};

export type BetBuilderHighlightCardResponse = {
  cardId: string;
  eventId: number;
  matchName: string;
  sport: WidgetSportRef;
  league: WidgetLeagueRef;
  region: WidgetRegionRef;
  startTime: string;
  competitors?: WidgetCompetitorRef[];
  picks: BetBuilderHighlightPickResponse[];
  combinedOdds: number;
  bbCombinedOdds?: number | null;
  displayOrder?: number;
};

export type BetBuilderHighlightsApiResponse = {
  data: BetBuilderHighlightCardResponse[];
  meta: { count: number; generatedAt?: string };
};

export type StarPlayerCardResponse = {
  cardId: string;
  eventId: number;
  playerName: string;
  matchName: string;
  sport: WidgetSportRef;
  league: WidgetLeagueRef;
  region: WidgetRegionRef;
  startTime: string;
  competitors?: WidgetCompetitorRef[];
  picks: StarPlayerPickResponse[];
  /** Product of leg odds (local). */
  combinedOdds: number;
  /** Provider Bet Builder price; use for bundle display and BB placement. */
  bbCombinedOdds?: number | null;
  displayOrder?: number;
};

export type StarPlayersApiResponse = {
  data: StarPlayerCardResponse[];
  meta: { count: number; generatedAt?: string };
};

export type TrendingAccaLegResponse = WidgetParamFields & {
  eventId: number;
  matchName: string;
  sport: WidgetSportRef;
  region: WidgetRegionRef;
  league: WidgetLeagueRef;
  startTime: string;
  competitors?: WidgetCompetitorRef[];
  marketId: number;
  selectionId: number;
  marketName: string;
  outcomeName: string;
  odds: number;
};

export type TrendingAccaCouponResponse = {
  couponId: string;
  foldCount: number;
  combinedOdds: number;
  socialProof?: { betCount: number };
  legs: TrendingAccaLegResponse[];
  displayOrder?: number;
};

export type TrendingAccasApiResponse = {
  data: TrendingAccaCouponResponse[];
  meta: { couponCount: number; generatedAt?: string };
};

type HomeWidgetQuery = {
  lang?: string;
  limit?: number;
  sportId?: number;
};

function widgetParams(q?: HomeWidgetQuery): Record<string, string | number> {
  const lang = q?.lang ?? getAppConfig().lang ?? "en";
  const params: Record<string, string | number> = { lang };
  if (q?.limit != null) params.limit = q.limit;
  if (q?.sportId != null) params.sportId = q.sportId;
  return params;
}

function seedWidgetSelections(
  picks: {
    eventId: number;
    marketId: number;
    selectionId: number;
    odds: number;
  }[],
) {
  for (const pick of picks) {
    const storeOddsTemp = {
      id: pick.selectionId,
      eId: pick.eventId,
      mId: pick.marketId,
      etradingStatus: 0,
      mtradingStatus: 0,
      status: 0,
      price: pick.odds,
      mv: 0,
    };
    const key = selectionStoreKey(
      pick.eventId,
      pick.marketId,
      pick.selectionId,
    );
    selectionsStoreState.value = {
      ...selectionsStoreState.value,
      [key]: signal(storeOddsTemp),
    };
  }
}

export async function apiGetBetBuilderHighlights(
  query?: HomeWidgetQuery,
): Promise<BetBuilderHighlightsApiResponse> {
  const { data } = await instance.get<BetBuilderHighlightsApiResponse>(
    "/home/bet-builder-highlights",
    { params: widgetParams({ limit: 20, ...query }) },
  );
  for (const card of data.data) {
    seedWidgetSelections(card.picks);
  }
  return data;
}

export async function apiGetStarPlayers(
  query?: HomeWidgetQuery,
): Promise<StarPlayersApiResponse> {
  const { data } = await instance.get<StarPlayersApiResponse>(
    "/home/star-players",
    { params: widgetParams(query) },
  );
  for (const card of data.data) {
    seedWidgetSelections(card.picks);
  }
  return data;
}

export async function apiGetTrendingAccas(
  query?: HomeWidgetQuery,
): Promise<TrendingAccasApiResponse> {
  const { data } = await instance.get<TrendingAccasApiResponse>(
    "/home/trending-accas",
    { params: widgetParams({ limit: 5, ...query }) },
  );

  for (const coupon of data.data) {
    seedWidgetSelections(coupon.legs);
  }

  return data;
}
