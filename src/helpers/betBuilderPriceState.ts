import type { SelectedOddType } from "@/shared/utils/bet";
import {
  betBuilderCombinable,
  betBuilderPrice,
  betBuilderPriceLoading,
  betBuilderPricesByEvent,
  betBuilderRejectMessage,
  selectedOdds,
  type EventBetBuilderPriceState,
} from "@/state/betState";
import { groupSelectedOddsIntoLegs } from "@/helpers/betslipLegs";

/** Stable key for a bet-builder selection set — skip duplicate price fetches when unchanged. */
export function betBuilderSelectionKey(
  selections: SelectedOddType[],
): string {
  return selections
    .map(
      (b) =>
        `${b.apiMarketId ?? b.marketId}:${b.apiSelectionId ?? Number(b.oddsId)}`,
    )
    .sort()
    .join("|");
}

export function syncLegacyBetBuilderSignals(
  states: Record<number, EventBetBuilderPriceState>,
): void {
  const bbLegs = groupSelectedOddsIntoLegs(selectedOdds.value).filter(
    (l) => l.type === "betbuilder",
  );
  if (bbLegs.length === 0) {
    betBuilderPrice.value = null;
    betBuilderCombinable.value = false;
    betBuilderRejectMessage.value = null;
    betBuilderPriceLoading.value = false;
    return;
  }

  const primaryEventId =
    bbLegs[0]?.type === "betbuilder" ? bbLegs[0].eventId : null;
  const primary =
    primaryEventId != null ? states[primaryEventId] : undefined;

  betBuilderPrice.value = primary?.price ?? null;
  betBuilderCombinable.value = primary?.combinable ?? false;
  betBuilderRejectMessage.value = primary?.rejectMessage ?? null;
  betBuilderPriceLoading.value = primary?.loading ?? false;
}

export function hasFreshBetBuilderPrice(
  eventId: number,
  selections: SelectedOddType[],
): boolean {
  const cached = betBuilderPricesByEvent.value[eventId];
  if (!cached || cached.loading || !cached.combinable) return false;
  if (cached.price == null || cached.price <= 1) return false;
  return cached.selectionKey === betBuilderSelectionKey(selections);
}

export function applyBetBuilderPriceForEvent(
  eventId: number,
  price: number,
  selections: SelectedOddType[],
): void {
  betBuilderPricesByEvent.value = {
    ...betBuilderPricesByEvent.value,
    [eventId]: {
      price,
      combinable: true,
      loading: false,
      rejectMessage: null,
      selectionKey: betBuilderSelectionKey(selections),
    },
  };
  syncLegacyBetBuilderSignals(betBuilderPricesByEvent.value);
}
