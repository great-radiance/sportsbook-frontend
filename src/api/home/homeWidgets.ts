import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";

export type WidgetSportRef = { id: number; name: string };
export type WidgetRegionRef = { id: number; name: string };
export type WidgetLeagueRef = { id: number; name: string };

export type StarPlayerPickRole = "player_prop" | "match_result" | "total_goals";

export type StarPlayerPickResponse = {
  role: StarPlayerPickRole;
  eventId: number;
  marketId: number;
  selectionId: number;
  marketName: string;
  outcomeName: string;
  odds: number;
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
  picks: StarPlayerPickResponse[];
  combinedOdds: number;
  displayOrder?: number;
};

export type StarPlayersApiResponse = {
  data: StarPlayerCardResponse[];
  meta: { count: number; generatedAt?: string };
};

export type TrendingAccaLegResponse = {
  eventId: number;
  matchName: string;
  sport: WidgetSportRef;
  region: WidgetRegionRef;
  league: WidgetLeagueRef;
  startTime: string;
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

export async function apiGetStarPlayers(
  query?: HomeWidgetQuery,
): Promise<StarPlayersApiResponse> {
  const { data } = await instance.get<StarPlayersApiResponse>(
    "/home/star-players",
    { params: widgetParams(query) },
  );
  return data;
}

export async function apiGetTrendingAccas(
  query?: HomeWidgetQuery,
): Promise<TrendingAccasApiResponse> {
  const { data } = await instance.get<TrendingAccasApiResponse>(
    "/home/trending-accas",
    { params: widgetParams({ limit: 3, ...query }) },
  );
  return data;
}
