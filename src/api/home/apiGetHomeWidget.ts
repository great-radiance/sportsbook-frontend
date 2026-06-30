import { instance } from "../instance";
import {
  bbPriceFromSlip,
  bundleOdds,
  parseEvent,
  slipToPicks,
  type ApiEventInfo,
  type ApiSlipLeg,
} from "./homeWidgetNormalize";
import {
  normalizeStarPlayers,
  type ApiStarPlayerEntry,
} from "./homeWidgetStarPlayers";
import type {
  BetBuilderHighlightCardResponse,
  BetBuilderHighlightPickResponse,
  NormalizedHomeWidgets,
  StarPlayerCardResponse,
  TrendingAccaCouponResponse,
  TrendingAccaLegResponse,
  WidgetCompetitor,
  WidgetEventCard,
  WidgetPickResponse,
} from "./homeWidgetTypes";

export type {
  ApiEventInfo,
  ApiSlipLeg,
  BetBuilderHighlightCardResponse,
  BetBuilderHighlightPickResponse,
  NormalizedHomeWidgets,
  StarPlayerCardResponse,
  TrendingAccaCouponResponse,
  TrendingAccaLegResponse,
  WidgetCompetitor,
  WidgetEventCard,
  WidgetPickResponse,
};

type HomeWidgetsApiResponse = {
  highlightBetBuilder?: { sportId: number; events: ApiWidgetEvent[] }[];
  trendingAccas?: {
    accas?: {
      legs: ApiWidgetEvent[];
      totalOdds?: number | null;
      totalBetCount?: number | null;
    }[];
  };
  starPlayers?: {
    sportId: number;
    players: ApiStarPlayerEntry[];
  }[];
  promotedMatches?: unknown[];
};

type ApiWidgetEvent = {
  eventInfo: ApiEventInfo;
  slip: ApiSlipLeg[];
};

function normalizeTrendingAccas(
  raw: HomeWidgetsApiResponse,
): TrendingAccaCouponResponse[] {
  return (raw.trendingAccas?.accas ?? []).map((acca, index) => {
    const legs: TrendingAccaLegResponse[] = [];

    for (const leg of acca.legs) {
      const event = parseEvent(leg.eventInfo);
      const pick = slipToPicks(leg.slip, event)[0];
      if (!pick) continue;
      legs.push({
        ...pick,
        sport: event.sport,
        region: event.region,
        league: event.league,
        startTime: event.startTime,
        matchName: event.matchName,
        competitors: event.competitors,
      });
    }

    const combinedOdds =
      typeof acca.totalOdds === "number" && acca.totalOdds > 0
        ? acca.totalOdds
        : legs.reduce((acc, leg) => acc * leg.odds, 1);

    return {
      couponId: `acca-${index}`,
      foldCount: legs.length,
      combinedOdds,
      legs,
      socialProof:
        typeof acca.totalBetCount === "number" && acca.totalBetCount > 0
          ? { betCount: acca.totalBetCount }
          : undefined,
    };
  });
}

function normalizeHighlightBetBuilder(
  raw: HomeWidgetsApiResponse,
): BetBuilderHighlightCardResponse[] {
  const highlightBetBuilder: BetBuilderHighlightCardResponse[] = [];

  for (const group of raw.highlightBetBuilder ?? []) {
    group.events.forEach((item, index) => {
      const event = parseEvent(item.eventInfo);
      const picks = slipToPicks(item.slip, event);
      if (!picks.length) return;

      const bbCombinedOdds = bbPriceFromSlip(item.slip);
      highlightBetBuilder.push({
        cardId: `bb-${group.sportId}-${event.eventId}-${index}`,
        sportId: group.sportId,
        ...event,
        picks,
        bbCombinedOdds,
        combinedOdds: bundleOdds(picks, bbCombinedOdds),
      });
    });
  }

  return highlightBetBuilder;
}

export async function normalizeHomeWidgets(
  raw: HomeWidgetsApiResponse,
): Promise<NormalizedHomeWidgets> {
  const [starPlayers, trendingAccas, highlightBetBuilder] = await Promise.all([
    normalizeStarPlayers(raw.starPlayers),
    Promise.resolve(normalizeTrendingAccas(raw)),
    Promise.resolve(normalizeHighlightBetBuilder(raw)),
  ]);

  return { starPlayers, trendingAccas, highlightBetBuilder };
}

export async function apiGetHomeWidgets(): Promise<NormalizedHomeWidgets> {
  const { data } =
    await instance.get<HomeWidgetsApiResponse>("users/homeWidget");
  return normalizeHomeWidgets(data);
}

export {
  normalizeStarPlayers,
  parseCompetitorId,
  reconcileStarPlayerWinnerLeg,
  starPlayerNameFromSlip,
} from "./homeWidgetStarPlayers";
