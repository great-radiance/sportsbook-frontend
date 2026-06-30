import type { WidgetCompetitor, WidgetPickResponse } from "./homeWidgetTypes";

export type ApiCompetitor = {
  id?: number;
  name?: string;
  logo?: string | null;
};

export type ApiEventInfo = {
  id?: number;
  name?: string;
  startTime?: string | null;
  sport?: { id?: number; name?: string | null };
  country?: { id?: number; name?: string | null };
  competition?: { id?: number; name?: string | null };
  competitors?: ApiCompetitor[] | null;
};

export type ApiMarketSelection = {
  id: number;
  name: string;
  price: number;
  status: number;
  competitorId?: number;
  extraParameters?: Record<string, unknown>;
};

export type ApiSlipLeg = {
  market?: {
    id?: number;
    name?: string | null;
    type?: number;
    parameters?: Record<string, unknown>;
    extraParameters?: Record<string, unknown>;
    selections?: ApiMarketSelection[];
  };
  selection?: {
    id?: number;
    name?: string | null;
    price?: number | null;
    competitorId?: number;
    extraParameters?: Record<string, unknown>;
  };
  bbPrice?: number | null;
  betCount?: number | null;
};

const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;

export function parseEvent(info: ApiEventInfo) {
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

export function slipToPicks(
  slip: ApiSlipLeg[],
  event: ReturnType<typeof parseEvent>,
): WidgetPickResponse[] {
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

export function bbPriceFromSlip(slip: ApiSlipLeg[]): number | null {
  for (let i = slip.length - 1; i >= 0; i -= 1) {
    const price = slip[i]?.bbPrice;
    if (typeof price === "number" && price > 0) return price;
  }
  return null;
}

export function bundleOdds(
  picks: { odds: number }[],
  bbPrice: number | null | undefined,
): number {
  if (typeof bbPrice === "number" && bbPrice > 0) return bbPrice;
  return picks.reduce((acc, p) => acc * p.odds, 1);
}
