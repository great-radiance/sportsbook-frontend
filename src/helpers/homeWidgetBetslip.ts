import {
  isBetslipSelectionSelected,
  removeSlipSelectionsForEvent,
  toggleBetslipSelection,
  toggleBetslipSelectionAwait,
  type WidgetEventContext,
} from "@/helpers/betslipSelection";
import { verifyBetBuilderGroup } from "@/helpers/betBuilderSlipValidation";
import {
  applyBetBuilderPriceForEvent,
  betBuilderPriceSyncSuspended,
} from "@/helpers/betBuilderPriceState";
import { notify } from "@/shared/toast";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
import type { StarPlayerCardResponse } from "@/api/home/homeWidgets";
import {
  betBuilderCombinable,
  betBuilderPrice,
  betBuilderRejectMessage,
  buildingBetAmount,
  isBuilding,
  multipleBetAmount,
  selectedBetType,
  selectedOdds,
} from "@/state/betState";
import {
  selectionStoreKey,
  selectionsStoreState,
  storeState,
} from "@/state/storeState";
import { tSelectionValue } from "@/types/typesForSocket.ts/tEventModel";

export type WidgetSelectionInput = {
  eventId: number;
  marketId: number;
  selectionId: number;
  marketName: string;
  outcomeName: string;
  odds: number;
  sport?: { id: number; name: string };
  region?: { id: number; name: string };
  league?: { id: number; name: string };
  startTime?: string;
  matchName?: string;
};

function widgetEventFromPick(
  pick: WidgetSelectionInput,
): WidgetEventContext | undefined {
  if (!pick.sport || !pick.region || !pick.league) return undefined;
  return {
    sport: pick.sport,
    region: pick.region,
    league: pick.league,
    startTime: pick.startTime,
    matchName: pick.matchName,
  };
}

/** Selection exists in live event store or widget odds cache (no extra API). */
function isPickInStore(pick: WidgetSelectionInput): boolean {
  const key = selectionStoreKey(pick.eventId, pick.marketId, pick.selectionId);
  if (selectionsStoreState.value[key]) return true;

  const event = storeState.value[pick.eventId]?.value;
  if (!event) return false;

  const market = event.markets?.[pick.marketId]?.value;
  return !!market?.selections?.some((sig) => sig.value.id === pick.selectionId);
}

function addWidgetPick(
  pick: WidgetSelectionInput,
  opts: {
    building: boolean;
    betType: "single" | "multi";
    skipBetBuilderVerify?: boolean;
  },
): boolean {
  if (!isPickInStore(pick)) {
    notify(
      "Event is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  const event = storeState.value[pick.eventId]?.value;
  const selectionData =
    selectionsStoreState.value[
      selectionStoreKey(pick.eventId, pick.marketId, pick.selectionId)
    ]?.value;
  if (event && event.tradingStatus !== 0) {
    notify(
      "Event is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (selectionData && selectionData.etradingStatus !== 0) {
    notify(
      "Selection is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  const market = event?.markets?.[pick.marketId]?.value;
  const selection = market?.selections?.find(
    (sig) => sig.value.id === pick.selectionId,
  )?.value;
  const marketTradingStatus =
    market?.tradingStatus ?? selectionData?.mtradingStatus;

  if (marketTradingStatus === 1) {
    notify(
      `This market is suspended.${pick.eventId} ${pick.marketName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }
  if (
    marketTradingStatus != null &&
    marketTradingStatus !== 0 &&
    marketTradingStatus !== 1
  ) {
    notify(
      `This market is no longer available.${pick.eventId} ${pick.marketName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  const selectionStatus = selection?.status ?? selectionData?.status;

  if (selectionStatus === 1) {
    notify(
      `This selection is suspended.${pick.eventId} ${pick.marketName} - ${pick.outcomeName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (
    selectionStatus != null &&
    selectionStatus !== 0 &&
    selectionStatus !== 1
  ) {
    notify(
      `This selection is no longer available.${pick.eventId} ${pick.marketName} - ${pick.outcomeName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  const widgetEvent = widgetEventFromPick(pick);
  if (!event && !widgetEvent) {
    notify(
      "Unable to add selection to betslip. Please try again.",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  isBuilding.value = opts.building;
  selectedBetType.value = opts.betType;

  if (
    isBetslipSelectionSelected(pick.eventId, pick.marketId, pick.selectionId)
  ) {
    return true;
  }

  const cachedPrice = selectionData?.price;
  const selectTemp: tSelectionValue = selection
    ? selection
    : {
        id: pick.selectionId,
        name: pick.outcomeName,
        probability: 0,
        price: cachedPrice ?? pick.odds,
        originalPrice: cachedPrice ?? pick.odds,
        status: selectionData?.status ?? 0,
        settlement: 0,
        deadHeatFactor: 0,
        extraParameters: {},
        isBetBuilderSupported: false,
        competitionId: 0,
        startingPrice: 0,
        mv: selectionData?.mv ?? 0,
      };
  toggleBetslipSelection({
    eventId: pick.eventId,
    marketId: pick.marketId,
    marketName: pick.marketName,
    selection: selectTemp,
    apiMarketId: pick.marketId,
    widgetEvent,
    skipBetBuilderVerify: opts.skipBetBuilderVerify,
  });

  return isBetslipSelectionSelected(
    pick.eventId,
    pick.marketId,
    pick.selectionId,
  );
}

/** Like `addWidgetPick` but awaits the slip queue (for star-player bundles). */
async function addWidgetPickAwait(
  pick: WidgetSelectionInput,
  opts: {
    building: boolean;
    betType: "single" | "multi";
    skipBetBuilderVerify?: boolean;
  },
): Promise<boolean> {
  if (!isPickInStore(pick)) {
    notify(
      "Event is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  const event = storeState.value[pick.eventId]?.value;
  const selectionData =
    selectionsStoreState.value[
      selectionStoreKey(pick.eventId, pick.marketId, pick.selectionId)
    ]?.value;
  if (event && event.tradingStatus !== 0) {
    notify(
      "Event is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (selectionData && selectionData.etradingStatus !== 0) {
    notify(
      "Selection is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  const market = event?.markets?.[pick.marketId]?.value;
  const selection = market?.selections?.find(
    (sig) => sig.value.id === pick.selectionId,
  )?.value;
  const marketTradingStatus =
    market?.tradingStatus ?? selectionData?.mtradingStatus;

  if (marketTradingStatus === 1) {
    notify(
      `This market is suspended.${pick.eventId} ${pick.marketName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }
  if (
    marketTradingStatus != null &&
    marketTradingStatus !== 0 &&
    marketTradingStatus !== 1
  ) {
    notify(
      `This market is no longer available.${pick.eventId} ${pick.marketName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  const selectionStatus = selection?.status ?? selectionData?.status;

  if (selectionStatus === 1) {
    notify(
      `This selection is suspended.${pick.eventId} ${pick.marketName} - ${pick.outcomeName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (
    selectionStatus != null &&
    selectionStatus !== 0 &&
    selectionStatus !== 1
  ) {
    notify(
      `This selection is no longer available.${pick.eventId} ${pick.marketName} - ${pick.outcomeName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  const widgetEvent = widgetEventFromPick(pick);
  if (!event && !widgetEvent) {
    notify(
      "Unable to add selection to betslip. Please try again.",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  isBuilding.value = opts.building;
  selectedBetType.value = opts.betType;

  if (
    isBetslipSelectionSelected(pick.eventId, pick.marketId, pick.selectionId)
  ) {
    return true;
  }

  const cachedPrice = selectionData?.price;
  const selectTemp: tSelectionValue = selection
    ? selection
    : {
        id: pick.selectionId,
        name: pick.outcomeName,
        probability: 0,
        price: cachedPrice ?? pick.odds,
        originalPrice: cachedPrice ?? pick.odds,
        status: selectionData?.status ?? 0,
        settlement: 0,
        deadHeatFactor: 0,
        extraParameters: {},
        isBetBuilderSupported: false,
        competitionId: 0,
        startingPrice: 0,
        mv: selectionData?.mv ?? 0,
      };

  await toggleBetslipSelectionAwait({
    eventId: pick.eventId,
    marketId: pick.marketId,
    marketName: pick.marketName,
    selection: selectTemp,
    apiMarketId: pick.marketId,
    widgetEvent,
    skipBetBuilderVerify: opts.skipBetBuilderVerify,
  });

  return isBetslipSelectionSelected(
    pick.eventId,
    pick.marketId,
    pick.selectionId,
  );
}

/** One leg as a single bet. */
export function addSingleWidgetPickToSlip(pick: WidgetSelectionInput): void {
  isBuilding.value = false;
  selectedBetType.value = "single";
  if (addWidgetPick(pick, { building: false, betType: "single" })) {
    betSlipExpanded.value = true;
  }
}

/** Star player bundle — add all picks, then one `bet-builder/price` for the combined set. */
export async function addStarPlayerBundleToSlip(
  card: StarPlayerCardResponse,
  picks: WidgetSelectionInput[],
): Promise<void> {
  if (picks.length === 0) return;

  const eventId = picks[0].eventId;

  betBuilderPriceSyncSuspended.value += 1;
  try {
    selectedOdds.value = selectedOdds.value.filter((o) => !o.isBuilding);
    isBuilding.value = true;
    selectedBetType.value = "single";
    buildingBetAmount.value = 0;

    let added = 0;
    for (const pick of picks) {
      if (
        await addWidgetPickAwait(pick, {
          building: true,
          betType: "single",
          skipBetBuilderVerify: true,
        })
      ) {
        added += 1;
      }
    }

    if (added === 0) return;

    const group = selectedOdds.value.filter((o) => o.eventId === eventId);

    if (group.length >= 2) {
      const check = await verifyBetBuilderGroup(eventId, group);
      if (!check.combinable) {
        removeSlipSelectionsForEvent(eventId);
        notify(check.message, "error", "x-circle", 3500);
        return;
      }
      applyBetBuilderPriceForEvent(eventId, check.price, group);
    } else if (
      typeof card.bbCombinedOdds === "number" &&
      card.bbCombinedOdds > 0
    ) {
      betBuilderPrice.value = card.bbCombinedOdds;
      betBuilderCombinable.value = true;
      betBuilderRejectMessage.value = null;
    }

    betSlipExpanded.value = true;
  } finally {
    betBuilderPriceSyncSuspended.value -= 1;
  }
}

/** Trending acca — parlay across distinct events. */
export function addTrendingAccaToSlip(legs: WidgetSelectionInput[]): void {
  if (legs.length === 0) return;

  isBuilding.value = false;
  selectedBetType.value = "multi";
  multipleBetAmount.value = 0;

  selectedOdds.value = selectedOdds.value.filter((o) => o.isBuilding);

  for (const leg of legs) {
    addWidgetPick(leg, { building: false, betType: "multi" });
  }

  const allLegsOnSlip = legs.every((leg) =>
    isBetslipSelectionSelected(leg.eventId, leg.marketId, leg.selectionId),
  );

  if (allLegsOnSlip) {
    selectedBetType.value = "multi";
    betSlipExpanded.value = true;
    return;
  }
}
