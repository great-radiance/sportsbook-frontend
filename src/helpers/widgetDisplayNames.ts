import { completeName } from "@/helpers/completeName";
import type {
  BetBuilderHighlightCardResponse,
  BetBuilderHighlightPickResponse,
  StarPlayerCardResponse,
  WidgetCompetitor,
  WidgetPickResponse,
} from "@/api/home/apiGetHomeWidget";
import type { WidgetSelectionInput } from "@/helpers/homeWidgetBetslip";
import type { competitor } from "@/types/typesForSocket.ts/tEventModel";

export type WidgetCompetitorRef = WidgetCompetitor;

export type WidgetNameFields = {
  marketName: string;
  outcomeName: string;
  parameters?: Record<string, unknown> | null;
  extraParameters?: Record<string, unknown> | null;
  selectionExtraParameters?: Record<string, unknown> | null;
  competitors?: WidgetCompetitorRef[] | null;
};

/** Coerce API param objects to string maps for `completeName`. */
export function coerceNameParams(
  params?: Record<string, unknown> | null,
): Record<string, string> | undefined {
  if (!params) return undefined;
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(params)) {
    if (val == null || val === "") continue;
    out[key] = String(val);
  }
  if (out.totalValue != null && out.total == null) {
    out.total = out.totalValue;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function widgetCompetitors(
  list?: WidgetCompetitorRef[] | null,
): competitor[] {
  return (list ?? []).map((c) => ({ id: c.id, name: c.name }));
}

export function widgetMarketDisplayName(fields: WidgetNameFields): string {
  const competitors = widgetCompetitors(fields.competitors);
  const parameters = coerceNameParams(fields.parameters);
  const extraParameters = coerceNameParams(fields.extraParameters);
  return completeName(
    fields.marketName,
    competitors,
    parameters,
    extraParameters,
  );
}

export function widgetOutcomeDisplayName(fields: WidgetNameFields): string {
  const competitors = widgetCompetitors(fields.competitors);
  const parameters = coerceNameParams(fields.parameters);
  const extraParameters = coerceNameParams({
    ...(fields.extraParameters ?? {}),
    ...(fields.selectionExtraParameters ?? {}),
  });
  return completeName(
    fields.outcomeName,
    competitors,
    parameters,
    extraParameters,
  );
}

export function widgetPickToSlipInput(
  pick: WidgetPickResponse,
  card: {
    sport: { id: number; name: string };
    region: { id: number; name: string };
    league: { id: number; name: string };
    startTime: string;
    matchName: string;
    competitors?: WidgetCompetitor[];
  },
): WidgetSelectionInput {
  const fields = { ...pick, competitors: card.competitors };
  return {
    eventId: pick.eventId,
    marketId: pick.marketId,
    selectionId: pick.selectionId,
    marketName: widgetMarketDisplayName(fields),
    outcomeName: widgetOutcomeDisplayName(fields),
    odds: pick.odds,
    sport: card.sport,
    region: card.region,
    league: card.league,
    startTime: card.startTime,
    matchName: card.matchName,
  };
}

export function widgetBundleOdds(card: {
  bbCombinedOdds?: number | null;
  combinedOdds?: number;
  picks: { odds: number }[];
}): number {
  if (
    typeof card.bbCombinedOdds === "number" &&
    Number.isFinite(card.bbCombinedOdds) &&
    card.bbCombinedOdds > 0
  ) {
    return card.bbCombinedOdds;
  }
  if (
    typeof card.combinedOdds === "number" &&
    Number.isFinite(card.combinedOdds) &&
    card.combinedOdds > 0
  ) {
    return card.combinedOdds;
  }
  return card.picks.reduce((acc, pick) => acc * pick.odds, 1);
}

/** Hero name on Star Player cards. */
export function starPlayerDisplayName(card: StarPlayerCardResponse): string {
  return card.playerName?.trim() || card.picks[0]?.outcomeName || "";
}

/** Bet Builder highlight pick line — `label` from admin config, else market + outcome. */
export function betBuilderHighlightPickLine(
  pick: BetBuilderHighlightPickResponse,
  card: BetBuilderHighlightCardResponse,
): string {
  const fields = { ...pick, competitors: card.competitors };
  const outcome = widgetOutcomeDisplayName(fields);
  const label = pick.label?.trim();
  if (label) return `${label} - ${outcome}`;
  return `${widgetMarketDisplayName(fields)} - ${outcome}`;
}

export const betBuilderHighlightOdds = widgetBundleOdds;
export const starPlayerBundleOdds = widgetBundleOdds;
