import { selectedBetType, isBuilding, selectedOdds } from "@/state/betState";
import { storeState } from "@/state/storeState";
import { SelectedOddType } from "@/shared/utils/bet";
import { notify } from "@/shared/toast";
import { storeSelection, removeFromOddsStore } from "@/helpers/storeEvent";
import { tSelectionValue } from "@/types/typesForSocket.ts/tEventModel";
import { tParticipant } from "@/types/tEvent";

export function isBetslipSelectionSelected(
  eventId: number,
  marketKey: string,
  selectionId: number,
): boolean {
  return selectedOdds.value.some(
    (o) =>
      o.eventId === eventId &&
      o.marketId === marketKey &&
      o.oddsId === String(selectionId),
  );
}

export type ToggleBetslipSelectionArgs = {
  eventId: number;
  marketKey: string;
  marketName: string;
  selection: tSelectionValue;
  apiMarketId: number;
};

export function toggleBetslipSelection({
  eventId,
  marketKey,
  marketName,
  selection,
  apiMarketId,
}: ToggleBetslipSelectionArgs): void {
  const oddsId = String(selection.id);
  const selId = selection.id;

  if (isBetslipSelectionSelected(eventId, marketKey, selId)) {
    removeFromOddsStore([oddsId]);
    selectedOdds.value = selectedOdds.value.filter(
      (o) =>
        !(
          o.eventId === eventId &&
          o.marketId === marketKey &&
          o.oddsId === oddsId
        ),
    );
    return;
  }

  const ev = storeState.value[eventId]?.value;
  if (!ev) return;

  if (isBuilding.value) {
    const building = selectedOdds.value.filter((o) => o.isBuilding);
    if (building.length > 0 && building[0].eventId !== eventId) {
      notify(
        "These selections cannot be combined from different events.",
        "warning",
        "exclamation-triangle",
        2800,
      );
      return;
    }
  }

  let next = [...selectedOdds.value];

  if (selectedBetType.value !== "multi" && selectedBetType.value !== "system") {
    const toRemove = next.filter(
      (o) =>
        o.eventId === eventId && o.marketId === marketKey && !o.isBuilding,
    );
    if (toRemove.length) {
      removeFromOddsStore(toRemove.map((o) => o.oddsId));
      next = next.filter(
        (o) =>
          !(
            o.eventId === eventId &&
            o.marketId === marketKey &&
            !o.isBuilding
          ),
      );
    }
  }

  if (selectedBetType.value === "multi" || selectedBetType.value === "system") {
    const nonBuilding = next.filter((o) => !o.isBuilding);
    if (nonBuilding.some((o) => o.eventId === eventId)) {
      const toRemove = nonBuilding
        .filter((o) => o.eventId === eventId)
        .map((o) => o.oddsId);
      removeFromOddsStore(toRemove);
      next = next.filter((o) => o.isBuilding || o.eventId !== eventId);
    }
  }

  const participants: tParticipant[] = (ev.competitors ?? []).map((c, i) => ({
    name: c.name,
    home: i === 0,
  }));

  const row: SelectedOddType = {
    sport: { id: ev.sport.id, name: ev.sport.name },
    region: { id: ev.region.id, name: ev.region.name },
    league: { id: ev.league.id, name: ev.league.name },
    oddsId,
    name: selection.name,
    marketId: marketKey,
    eventId,
    sportSlug: String(ev.sport.id),
    marketName,
    participants,
    startDate: Date.parse(ev.startTime) || 0,
    isBuilding: isBuilding.value,
    selectedBank: false,
    amount: 0,
    apiMarketId,
    apiSelectionId: selection.id,
  };

  next.push(row);
  selectedOdds.value = next;
  storeSelection(eventId, marketKey, selection.id);
}
