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
