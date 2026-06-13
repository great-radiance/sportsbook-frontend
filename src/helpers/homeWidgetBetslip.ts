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
import type {
  BetBuilderHighlightCardResponse,
  StarPlayerCardResponse,
} from "@/api/home/apiGetHomeWidget";
import {
  sportsbookStore,
} from "@/state/sportsbookStoreContext";
import {
  type HomeWidgetSelectionEntry,
  selectionStoreKey,
} from "@/state/sportsbookStoreContext";
import { tSelectionValue } from "@/types/typesForSocket.ts/tEventModel";

const {
  betBuilderCombinable,
  betBuilderPrice,
  betBuilderRejectMessage,
  buildingBetAmount,
  homeWidgetsSelectionsCache,
  isBuilding,
  multipleBetAmount,
  selectedBetType,
  selectedOdds,
} = sportsbookStore;

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

function getWidgetSelectionData(
  pick: WidgetSelectionInput,
): HomeWidgetSelectionEntry | undefined {
  const key = selectionStoreKey(
    pick.eventId,
    pick.marketId,
    pick.selectionId,
  );
  return homeWidgetsSelectionsCache.value[key]?.value;
}

function validateWidgetSelection(
  pick: WidgetSelectionInput,
  selectionData: HomeWidgetSelectionEntry,
): boolean {
  if (selectionData.etradingStatus !== 0) {
    notify(
      "Event is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (selectionData.mtradingStatus === 1) {
    notify(
      `This market is suspended.${pick.eventId} ${pick.marketName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (
    selectionData.mtradingStatus != null &&
    selectionData.mtradingStatus !== 0 &&
    selectionData.mtradingStatus !== 1
  ) {
    notify(
      `This market is no longer available.${pick.eventId} ${pick.marketName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (selectionData.status === 1) {
    notify(
      `This selection is suspended.${pick.eventId} ${pick.marketName} - ${pick.outcomeName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (
    selectionData.status != null &&
    selectionData.status !== 0 &&
    selectionData.status !== 1
  ) {
    notify(
      `This selection is no longer available.${pick.eventId} ${pick.marketName} - ${pick.outcomeName}`,
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  return true;
}

function addWidgetPick(
  pick: WidgetSelectionInput,
  opts: {
    building: boolean;
    betType: "single" | "multi";
    skipBetBuilderVerify?: boolean;
  },
): boolean {
  const selectionData = getWidgetSelectionData(pick);
  if (!selectionData) {
    notify(
      "Event is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (!validateWidgetSelection(pick, selectionData)) {
    return false;
  }

  const widgetEvent = widgetEventFromPick(pick);
  if (!widgetEvent) {
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

  const price = selectionData.price ?? pick.odds;
  const selectTemp: tSelectionValue = {
    id: pick.selectionId,
    name: pick.outcomeName,
    probability: 0,
    price,
    originalPrice: price,
    status: selectionData.status ?? 0,
    settlement: 0,
    deadHeatFactor: 0,
    extraParameters: {},
    isBetBuilderSupported: false,
    competitionId: 0,
    startingPrice: 0,
    mv: selectionData.mv ?? 0,
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
  const selectionData = getWidgetSelectionData(pick);
  if (!selectionData) {
    notify(
      "Event is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  if (!validateWidgetSelection(pick, selectionData)) {
    return false;
  }

  const widgetEvent = widgetEventFromPick(pick);
  if (!widgetEvent) {
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

  const price = selectionData.price ?? pick.odds;
  const selectTemp: tSelectionValue = {
    id: pick.selectionId,
    name: pick.outcomeName,
    probability: 0,
    price,
    originalPrice: price,
    status: selectionData.status ?? 0,
    settlement: 0,
    deadHeatFactor: 0,
    extraParameters: {},
    isBetBuilderSupported: false,
    competitionId: 0,
    startingPrice: 0,
    mv: selectionData.mv ?? 0,
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

/** Bet Builder highlight card — same-event bundle (like Star Players). */
export function addBetBuilderHighlightToSlip(
  card: BetBuilderHighlightCardResponse,
  picks: WidgetSelectionInput[],
): Promise<void> {
  return addStarPlayerBundleToSlip(
    card as unknown as StarPlayerCardResponse,
    picks,
  );
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
