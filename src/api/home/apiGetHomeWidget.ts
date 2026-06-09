import { instance } from "../instance";
import { completeName } from "@/helpers/completeName";

type ApiCompetitor = {
  id?: number;
  name?: string;
  logo?: string | null;
};

type ApiEventInfo = {
  id?: number;
  name?: string;
  startTime?: string | null;
  sport?: { id?: number; name?: string | null };
  country?: { id?: number; name?: string | null };
  competition?: { id?: number; name?: string | null };
  competitors?: ApiCompetitor[] | null;
};

type ApiSlipLeg = {
  market?: {
    id?: number;
    name?: string | null;
    parameters?: Record<string, unknown>;
    extraParameters?: Record<string, unknown>;
  };
  selection?: {
    id?: number;
    name?: string | null;
    price?: number | null;
    extraParameters?: Record<string, unknown>;
  };
  bbPrice?: number | null;
  betCount?: number | null;
};

type ApiWidgetEvent = {
  eventInfo: ApiEventInfo;
  slip: ApiSlipLeg[];
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
    players: {
      selectionName: string;
      eventInfo: ApiEventInfo;
      slip: ApiSlipLeg[];
    }[];
  }[];
  promotedMatches?: unknown[];
};

export type WidgetCompetitor = {
  id: number;
  name: string;
  logo?: string;
};

export type WidgetPickResponse = {
  eventId: number;
  marketId: number;
  selectionId: number;
  marketName: string;
  outcomeName: string;
  odds: number;
  parameters?: Record<string, unknown> | null;
  extraParameters?: Record<string, unknown> | null;
  selectionExtraParameters?: Record<string, unknown> | null;
  slotIndex: number;
  label?: string;
};

export type WidgetEventCard = {
  cardId: string;
  eventId: number;
  matchName: string;
  sport: { id: number; name: string };
  region: { id: number; name: string };
  league: { id: number; name: string };
  startTime: string;
  competitors: WidgetCompetitor[];
  picks: WidgetPickResponse[];
  combinedOdds: number;
  bbCombinedOdds?: number | null;
};

export type StarPlayerCardResponse = WidgetEventCard & {
  playerName: string;
};

export type TrendingAccaLegResponse = WidgetPickResponse & {
  sport: { id: number; name: string };
  region: { id: number; name: string };
  league: { id: number; name: string };
  startTime: string;
  matchName: string;
  competitors: WidgetCompetitor[];
};

export type TrendingAccaCouponResponse = {
  couponId: string;
  foldCount: number;
  combinedOdds: number;
  legs: TrendingAccaLegResponse[];
  socialProof?: { betCount: number };
};

export type BetBuilderHighlightPickResponse = WidgetPickResponse;
export type BetBuilderHighlightCardResponse = WidgetEventCard & {
  sportId: number;
};

export type NormalizedHomeWidgets = {
  starPlayers: StarPlayerCardResponse[];
  trendingAccas: TrendingAccaCouponResponse[];
  highlightBetBuilder: BetBuilderHighlightCardResponse[];
};

const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;

function parseEvent(info: ApiEventInfo) {
  const competitors: WidgetCompetitor[] = (info.competitors ?? [])
    .filter((c) => c.id != null && c.name)
    .map((c) => ({
      id: num(c.id),
      name: str(c.name),
      logo: c.logo ?? undefined,
    }));

  return {
    eventId: num(info.id),
    matchName: str(info.name),
    sport: {
      id: num(info.sport?.id),
      name: str(info.sport?.name),
    },
    region: {
      id: num(info.country?.id),
      name: str(info.country?.name),
    },
    league: {
      id: num(info.competition?.id),
      name: str(info.competition?.name),
    },
    startTime: str(info.startTime),
    competitors,
  };
}

function slipToPicks(slip: ApiSlipLeg[], event: ReturnType<typeof parseEvent>) {
  const picks: WidgetPickResponse[] = [];

  slip.forEach((leg, slotIndex) => {
    const market = leg.market;
    const selection = leg.selection;
    if (!market?.id || !selection?.id) return;

    picks.push({
      eventId: event.eventId,
      marketId: num(market.id),
      selectionId: num(selection.id),
      marketName: str(market.name),
      outcomeName: str(selection.name),
      odds: num(selection.price, 1),
      parameters: market.parameters ?? null,
      extraParameters: market.extraParameters ?? null,
      selectionExtraParameters: selection.extraParameters ?? null,
      slotIndex,
    });
  });

  return picks;
}

function bundleOdds(
  picks: { odds: number }[],
  bbPrice: number | null | undefined,
): number {
  if (typeof bbPrice === "number" && bbPrice > 0) return bbPrice;
  return picks.reduce((acc, p) => acc * p.odds, 1);
}

function bbPriceFromSlip(slip: ApiSlipLeg[]): number | null {
  for (let i = slip.length - 1; i >= 0; i -= 1) {
    const price = slip[i]?.bbPrice;
    if (typeof price === "number" && price > 0) return price;
  }
  return null;
}

function resolvePlayerName(
  selectionName: string,
  event: ReturnType<typeof parseEvent>,
): string {
  const resolved = completeName(
    selectionName,
    event.competitors.map((c) => ({ id: c.id, name: c.name })),
  );
  return resolved.trim() || selectionName;
}

export function normalizeHomeWidgets(
  raw: HomeWidgetsApiResponse,
): NormalizedHomeWidgets {
  const starPlayers: StarPlayerCardResponse[] = [];

  for (const group of raw.starPlayers ?? []) {
    group.players.forEach((player, index) => {
      const event = parseEvent(player.eventInfo);
      const picks = slipToPicks(player.slip, event);
      if (!picks.length) return;

      starPlayers.push({
        cardId: `sp-${event.eventId}-${index}`,
        playerName: resolvePlayerName(player.selectionName, event),
        ...event,
        picks,
        bbCombinedOdds: bbPriceFromSlip(player.slip),
        combinedOdds: bundleOdds(picks, bbPriceFromSlip(player.slip)),
      });
    });
  }

  const trendingAccas: TrendingAccaCouponResponse[] = (
    raw.trendingAccas?.accas ?? []
  ).map((acca, index) => {
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

  return { starPlayers, trendingAccas, highlightBetBuilder };
}

export async function apiGetHomeWidgets(): Promise<NormalizedHomeWidgets> {
  const { data } =
    await instance.get<HomeWidgetsApiResponse>("users/homeWidget");
  return normalizeHomeWidgets(data);
}
