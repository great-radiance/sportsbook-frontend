import { sportsbookStore } from "@/state/sportsbookStoreContext";
import { SelectedOddType } from "@/shared/utils/bet";
import { notify } from "@/shared/toast";
import { storeSelection, removeFromOddsStore } from "@/helpers/storeEvent";
import { selectionStoreKey } from "@/state/sportsbookStoreContext";
import { tSelectionValue } from "@/types/typesForSocket.ts/tEventModel";
import { tParticipant } from "@/types/tEvent";
import { slipLegCount } from "@/helpers/betslipLegs";
import { maxParlayLegsFromLimits } from "@/helpers/betLimits";
import { rotateBetSlipIdempotencyKey } from "@/helpers/betIdempotency";
import { verifyBetBuilderGroup } from "@/helpers/betBuilderSlipValidation";
import { applyBetBuilderPriceForEvent } from "@/helpers/betBuilderPriceState";

const { selectedBetType, selectedOdds, playerLimits, storeState } =
  sportsbookStore;

export function isBetslipSelectionSelected(
  eventId: number,
  marketId: number,
  selectionId: number,
): boolean {
  return selectedOdds.value.some(
    (o) =>
      o.eventId === eventId &&
      o.marketId === marketId &&
      o.oddsId === String(selectionId),
  );
}

/** Widget API metadata when the event is not yet in `storeState`. */
export type WidgetEventContext = {
  sport: { id: number; name: string };
  region: { id: number; name: string };
  league: { id: number; name: string };
  startTime?: string;
  matchName?: string;
};

function participantsFromWidgetMatchName(matchName?: string): tParticipant[] {
  if (!matchName?.trim()) return [];
  const parts = matchName.split(/\s+vs\s+/i);
  if (parts.length === 2) {
    return [
      { name: parts[0].trim(), home: true },
      { name: parts[1].trim(), home: false },
    ];
  }
  return [{ name: matchName.trim(), home: true }];
}

export type ToggleBetslipSelectionArgs = {
  eventId: number;
  marketId: number;
  marketName: string;
  selection: tSelectionValue;
  apiMarketId: number;
  widgetEvent?: WidgetEventContext;
  /** Skip per-add `verifyBetBuilderGroup` — caller validates the full group once. */
  skipBetBuilderVerify?: boolean;
};

const toggleQueueByEvent = new Map<number, Promise<void>>();

/** Remove every slip selection for one event (e.g. bet builder no longer combinable). */
export function removeSlipSelectionsForEvent(eventId: number): void {
  const toRemove = selectedOdds.value.filter((o) => o.eventId === eventId);
  if (!toRemove.length) return;

  removeFromOddsStore(
    toRemove.map((o) =>
      selectionStoreKey(o.eventId, o.marketId, Number(o.oddsId)),
    ),
  );
  selectedOdds.value = selectedOdds.value.filter((o) => o.eventId !== eventId);
  rotateBetSlipIdempotencyKey();
}

function enqueueToggleBetslipSelection(
  eventId: number,
  work: () => Promise<void>,
): Promise<void> {
  const prev = toggleQueueByEvent.get(eventId) ?? Promise.resolve();
  const next = prev
    .then(work)
    .catch((err) => console.error("toggleBetslipSelection failed:", err));
  toggleQueueByEvent.set(
    eventId,
    next.finally(() => {
      if (toggleQueueByEvent.get(eventId) === next) {
        toggleQueueByEvent.delete(eventId);
      }
    }),
  );
  return next;
}

export function toggleBetslipSelection(args: ToggleBetslipSelectionArgs): void {
  void enqueueToggleBetslipSelection(args.eventId, () =>
    toggleBetslipSelectionAsync(args),
  );
}

/** Await slip update — use when adding several legs before one bet-builder price call. */
export function toggleBetslipSelectionAwait(
  args: ToggleBetslipSelectionArgs,
): Promise<void> {
  return enqueueToggleBetslipSelection(args.eventId, () =>
    toggleBetslipSelectionAsync(args),
  );
}

async function toggleBetslipSelectionAsync({
  eventId,
  marketId,
  marketName,
  selection,
  apiMarketId,
  widgetEvent,
  skipBetBuilderVerify = false,
}: ToggleBetslipSelectionArgs): Promise<void> {
  const oddsId = String(selection.id);
  const selId = selection.id;

  if (isBetslipSelectionSelected(eventId, marketId, selId)) {
    removeFromOddsStore([selectionStoreKey(eventId, marketId, selId)]);
    selectedOdds.value = selectedOdds.value.filter(
      (o) =>
        !(
          o.eventId === eventId &&
          o.marketId === marketId &&
          o.oddsId === oddsId
        ),
    );
    rotateBetSlipIdempotencyKey();
    return;
  }

  const ev = storeState.value[eventId]?.value;
  if (!ev && !widgetEvent) return;

  if (selectedBetType.value !== "multi" && selectedBetType.value !== "system") {
    const toRemove = selectedOdds.value.filter(
      (o) => o.eventId === eventId && o.marketId === marketId,
    );
    if (toRemove.length) {
      removeFromOddsStore(
        toRemove.map((o) =>
          selectionStoreKey(o.eventId, o.marketId, Number(o.oddsId)),
        ),
      );
      selectedOdds.value = selectedOdds.value.filter(
        (o) => !(o.eventId === eventId && o.marketId === marketId),
      );
    }
  }

  const participants: tParticipant[] = ev
    ? (ev.competitors ?? []).map((c, i) => ({
        name: c.name,
        home: i === 0,
      }))
    : participantsFromWidgetMatchName(widgetEvent?.matchName);

  const row: SelectedOddType = {
    sport: ev
      ? { id: ev.sport.id, name: ev.sport.name }
      : {
          id: widgetEvent!.sport.id,
          name: widgetEvent!.sport.name,
        },
    region: ev
      ? { id: ev.region.id, name: ev.region.name }
      : {
          id: widgetEvent!.region.id,
          name: widgetEvent!.region.name,
        },
    league: ev
      ? { id: ev.league.id, name: ev.league.name }
      : {
          id: widgetEvent!.league.id,
          name: widgetEvent!.league.name,
        },
    oddsId,
    name: selection.name,
    marketId,
    eventId,
    sportSlug: String(ev?.sport.id ?? widgetEvent!.sport.id),
    marketName,
    participants,
    startDate: ev
      ? Date.parse(ev.startTime) || 0
      : Date.parse(widgetEvent?.startTime ?? "") || 0,
    isBuilding: false,
    selectedBank: false,
    amount: 0,
    apiMarketId,
    apiSelectionId: selection.id,
  };

  if (selectedBetType.value === "multi" || selectedBetType.value === "system") {
    const maxLegs = maxParlayLegsFromLimits(playerLimits.value);
    const nextOdds = [...selectedOdds.value, row];
    if (slipLegCount(nextOdds) > maxLegs) {
      notify(
        `Maximum ${maxLegs} legs per parlay`,
        "warning",
        "exclamation-triangle",
        2800,
      );
      return;
    }
  }

  const sameEventSelections = selectedOdds.value.filter(
    (o) => o.eventId === eventId,
  );
  const candidateGroup = [...sameEventSelections, row];

  if (!skipBetBuilderVerify && candidateGroup.length >= 2) {
    const check = await verifyBetBuilderGroup(eventId, candidateGroup);
    if (!check.combinable) {
      notify(check.message, "error", "x-circle", 3500);
      return;
    }
    applyBetBuilderPriceForEvent(eventId, check.price, candidateGroup);
  }

  selectedOdds.value = [...selectedOdds.value, row];
  storeSelection(eventId, marketId, selection.id);
  rotateBetSlipIdempotencyKey();
}
