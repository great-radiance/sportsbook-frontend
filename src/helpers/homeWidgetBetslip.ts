import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { storeEvent } from "@/helpers/storeEvent";
import {
  isBetslipSelectionSelected,
  toggleBetslipSelection,
} from "@/helpers/betslipSelection";
import { notify } from "@/shared/toast";
import { betSlipExpanded } from "@/shared/utils/BetSlipExpanded";
import {
  buildingBetAmount,
  isBuilding,
  multipleBetAmount,
  selectedBetType,
  selectedOdds,
} from "@/state/betState";
import { storeState } from "@/state/storeState";
import type { tEventModel } from "@/types/typesForSocket.ts/tEventModel";

export type WidgetSelectionInput = {
  eventId: number;
  marketId: number;
  selectionId: number;
  marketName: string;
  outcomeName: string;
  odds: number;
};

async function ensureEventsInStore(eventIds: number[]): Promise<void> {
  const unique = [...new Set(eventIds)].filter((id) => Number.isFinite(id) && id > 0);
  const missing = unique.filter((id) => {
    const ev = storeState.value[id]?.value;
    return !ev?.markets || Object.keys(ev.markets).length === 0;
  });
  if (missing.length === 0) return;
  const events = await apiGetMatches(missing);
  (events ?? []).forEach((event) => storeEvent(event));
}

function marketKeyForId(event: tEventModel, marketId: number): string {
  for (const key of Object.keys(event.markets ?? {})) {
    if (event.markets[key]?.value?.id === marketId) return key;
  }
  return String(marketId);
}

async function addWidgetPick(
  pick: WidgetSelectionInput,
  opts: { building: boolean; betType: "single" | "multi" },
): Promise<boolean> {
  await ensureEventsInStore([pick.eventId]);
  const event = storeState.value[pick.eventId]?.value;
  if (!event) {
    notify("Event is no longer available", "warning", "exclamation-triangle", 2800);
    return false;
  }

  const marketKey = marketKeyForId(event, pick.marketId);
  const market = event.markets[marketKey]?.value;
  const selection = market?.selections?.find(
    (sig) => sig.value.id === pick.selectionId,
  )?.value;

  if (!market || !selection) {
    notify(
      "This selection is no longer available",
      "warning",
      "exclamation-triangle",
      2800,
    );
    return false;
  }

  isBuilding.value = opts.building;
  selectedBetType.value = opts.betType;

  if (!isBetslipSelectionSelected(pick.eventId, marketKey, pick.selectionId)) {
    toggleBetslipSelection({
      eventId: pick.eventId,
      marketKey,
      marketName: pick.marketName,
      selection,
      apiMarketId: pick.marketId,
    });
  }

  return true;
}

/** One leg as a single bet. */
export async function addSingleWidgetPickToSlip(
  pick: WidgetSelectionInput,
): Promise<void> {
  isBuilding.value = false;
  const ok = await addWidgetPick(pick, { building: false, betType: "single" });
  if (ok) betSlipExpanded.value = true;
}

/** Star player card — three legs on the same event (bet builder / same-game parlay). */
export async function addStarPlayerBundleToSlip(
  picks: WidgetSelectionInput[],
): Promise<void> {
  if (picks.length === 0) return;
  const eventIds = [...new Set(picks.map((p) => p.eventId))];
  await ensureEventsInStore(eventIds);

  selectedOdds.value = selectedOdds.value.filter((o) => !o.isBuilding);
  isBuilding.value = true;
  selectedBetType.value = "single";
  buildingBetAmount.value = 0;

  let added = 0;
  for (const pick of picks) {
    const ok = await addWidgetPick(pick, { building: true, betType: "single" });
    if (ok) added++;
  }

  if (added > 0) {
    betSlipExpanded.value = true;
  }
}

/** Trending acca — parlay across distinct events. */
export async function addTrendingAccaToSlip(
  legs: WidgetSelectionInput[],
): Promise<void> {
  if (legs.length === 0) return;

  isBuilding.value = false;
  selectedBetType.value = "multi";
  multipleBetAmount.value = 0;

  const eventIds = legs.map((l) => l.eventId);
  await ensureEventsInStore(eventIds);

  let added = 0;
  for (const leg of legs) {
    const ok = await addWidgetPick(leg, { building: false, betType: "multi" });
    if (ok) added++;
  }

  if (added > 0) {
    betSlipExpanded.value = true;
  }
}
