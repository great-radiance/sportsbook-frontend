import type { PlaceBetSelectionPayload } from "@/api/bet/placeBet";
import { getOddsValue } from "@/helpers/getOddsValue";
import type { BetContextRef, SelectedOddType } from "@/shared/utils/bet";

export type RegularSlipLeg = {
  type: "regular";
  eventId: number;
  selection: SelectedOddType;
};

export type BetBuilderSlipLeg = {
  type: "betbuilder";
  eventId: number;
  eventName: string;
  sport: BetContextRef;
  selections: SelectedOddType[];
};

export type BetslipLeg = RegularSlipLeg | BetBuilderSlipLeg;

export function formatSlipEventName(odd: SelectedOddType): string {
  const p = odd.participants;
  if (p.length >= 2) {
    return `${p[0]?.name ?? ""} - ${p[1]?.name ?? ""}`;
  }
  return p[0]?.name ?? "";
}

/** Group selections by eventId — 2+ from one event form a bet-builder leg. */
export function groupSelectionsByEvent(
  odds: SelectedOddType[],
): Map<number, SelectedOddType[]> {
  const byEvent = new Map<number, SelectedOddType[]>();
  for (const odd of odds) {
    const list = byEvent.get(odd.eventId) ?? [];
    list.push(odd);
    byEvent.set(odd.eventId, list);
  }
  return byEvent;
}

/** Group selections by event — 2+ from one event form a bet-builder leg. */
export function groupSelectedOddsIntoLegs(
  odds: SelectedOddType[],
): BetslipLeg[] {
  const legs: BetslipLeg[] = [];
  for (const [eventId, selections] of groupSelectionsByEvent(odds)) {
    if (selections.length >= 2) {
      legs.push({
        type: "betbuilder",
        eventId,
        eventName: formatSlipEventName(selections[0]),
        sport: selections[0].sport,
        selections,
      });
    } else {
      legs.push({
        type: "regular",
        eventId,
        selection: selections[0],
      });
    }
  }
  return legs;
}

export function slipLegCount(odds: SelectedOddType[]): number {
  return groupSelectedOddsIntoLegs(odds).length;
}

export function legOdds(
  leg: BetslipLeg,
  bbPrices: Record<number, number | null | undefined>,
): number {
  if (leg.type === "betbuilder") {
    const price = bbPrices[leg.eventId];
    if (typeof price === "number" && price > 1) return price;
    return leg.selections.reduce(
      (acc, sel) =>
        acc *
        (getOddsValue(sel.eventId, sel.marketId, Number(sel.oddsId)) ?? 1),
      1,
    );
  }
  return (
    getOddsValue(
      leg.selection.eventId,
      leg.selection.marketId,
      Number(leg.selection.oddsId),
    ) ?? 1
  );
}

export function combinedLegOdds(
  legs: BetslipLeg[],
  bbPrices: Record<number, number | null | undefined>,
): number {
  if (legs.length === 0) return 1;
  return legs.reduce((acc, leg) => acc * legOdds(leg, bbPrices), 1);
}

export function buildPlaceBetSelections(
  legs: BetslipLeg[],
  bbPrices: Record<number, number | null | undefined>,
): PlaceBetSelectionPayload[] {
  return legs.map((leg) => {
    if (leg.type === "betbuilder") {
      const first = leg.selections[0];
      return {
        eventId: leg.eventId,
        marketId: -1,
        selectionId: -1,
        odds: legOdds(leg, bbPrices),
        betBuilderBetItems: leg.selections.map((sel) => ({
          marketId: sel.apiMarketId ?? sel.marketId,
          selectionId: sel.apiSelectionId ?? Number(sel.oddsId),
        })),
      };
    }
    const sel = leg.selection;
    return {
      eventId: sel.eventId,
      marketId: sel.apiMarketId ?? sel.marketId,
      selectionId: sel.apiSelectionId ?? Number(sel.oddsId),
      odds: getOddsValue(sel.eventId, sel.marketId, Number(sel.oddsId)) ?? 1,
    };
  });
}

export function allBetBuilderLegsCombinable(
  legs: BetslipLeg[],
  bbStates: Record<
    number,
    { combinable: boolean; loading: boolean } | undefined
  >,
): boolean {
  return legs.every((leg) => {
    if (leg.type !== "betbuilder" || leg.selections.length < 2) return true;
    const state = bbStates[leg.eventId];
    if (!state || state.loading) return false;
    return state.combinable;
  });
}

export function betBuilderLegRejectMessage(
  legs: BetslipLeg[],
  bbStates: Record<
    number,
    { combinable: boolean; rejectMessage: string | null } | undefined
  >,
): string | null {
  for (const leg of legs) {
    if (leg.type !== "betbuilder" || leg.selections.length < 2) continue;
    const state = bbStates[leg.eventId];
    if (state && !state.combinable && state.rejectMessage) {
      return state.rejectMessage;
    }
  }
  return null;
}

export function selectionsForLeg(leg: BetslipLeg): SelectedOddType[] {
  return leg.type === "betbuilder" ? leg.selections : [leg.selection];
}
