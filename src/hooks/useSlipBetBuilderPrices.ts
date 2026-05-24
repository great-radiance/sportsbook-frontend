import { useEffect, useRef } from "preact/hooks";
import {
  apiBetBuilderPrice,
  betBuilderRejectMessage as formatReject,
  isBetBuilderCombinable,
} from "@/api/bet/apiBetBuilderPrice";
import { BET_BUILDER_SEGMENT_ID } from "@/helpers/betBuilderSlipValidation";
import {
  betBuilderSelectionKey,
  hasFreshBetBuilderPrice,
  syncLegacyBetBuilderSignals,
} from "@/helpers/betBuilderPriceState";
import { removeSlipSelectionsForEvent } from "@/helpers/betslipSelection";
import { groupSelectedOddsIntoLegs } from "@/helpers/betslipLegs";
import {
  betBuilderPricesByEvent,
  selectedOdds,
  type EventBetBuilderPriceState,
} from "@/state/betState";
import { notify } from "@/shared/toast";

const DEFAULT_SEGMENT_ID = BET_BUILDER_SEGMENT_ID;

/**
 * Fetches `POST /odds88/bet-builder/price` for every event group with 2+ selections.
 * Skips fetch when toggle pre-check already cached a price for the same selection set.
 */
export function useSlipBetBuilderPricesSync() {
  const requestSeqByEvent = useRef(new Map<number, number>());

  useEffect(() => {
    const legs = groupSelectedOddsIntoLegs(selectedOdds.value);
    const bbLegs = legs.filter((l) => l.type === "betbuilder");
    const activeEvents = new Set(bbLegs.map((l) => l.eventId));

    const nextStates = { ...betBuilderPricesByEvent.value };
    for (const eventId of Object.keys(nextStates).map(Number)) {
      if (!activeEvents.has(eventId)) {
        delete nextStates[eventId];
        requestSeqByEvent.current.delete(eventId);
      }
    }
    betBuilderPricesByEvent.value = nextStates;

    if (bbLegs.length === 0) {
      syncLegacyBetBuilderSignals({});
      return;
    }

    const timers: number[] = [];

    for (const leg of bbLegs) {
      if (leg.type !== "betbuilder") continue;

      if (hasFreshBetBuilderPrice(leg.eventId, leg.selections)) {
        syncLegacyBetBuilderSignals(betBuilderPricesByEvent.value);
        continue;
      }

      const seq = (requestSeqByEvent.current.get(leg.eventId) ?? 0) + 1;
      requestSeqByEvent.current.set(leg.eventId, seq);

      betBuilderPricesByEvent.value = {
        ...betBuilderPricesByEvent.value,
        [leg.eventId]: {
          price: betBuilderPricesByEvent.value[leg.eventId]?.price ?? null,
          combinable: false,
          loading: true,
          rejectMessage: null,
          selectionKey: betBuilderSelectionKey(leg.selections),
        },
      };
      syncLegacyBetBuilderSignals(betBuilderPricesByEvent.value);

      const timer = window.setTimeout(async () => {
        try {
          const result = await apiBetBuilderPrice({
            requestId: crypto.randomUUID(),
            segmentId: DEFAULT_SEGMENT_ID,
            eventId: leg.eventId,
            bets: leg.selections.map((b) => ({
              marketId: b.apiMarketId ?? b.marketId,
              selectionId: b.apiSelectionId ?? Number(b.oddsId),
            })),
          });
          if (requestSeqByEvent.current.get(leg.eventId) !== seq) return;

          const selectionKey = betBuilderSelectionKey(leg.selections);

          const state: EventBetBuilderPriceState = isBetBuilderCombinable(result)
            ? {
                price: result.price ?? null,
                combinable: true,
                loading: false,
                rejectMessage: null,
                selectionKey,
              }
            : {
                price: null,
                combinable: false,
                loading: false,
                rejectMessage: formatReject(result.rejectInfo),
                selectionKey,
              };

          if (!state.combinable) {
            const message =
              state.rejectMessage ?? "These selections cannot be combined";
            removeSlipSelectionsForEvent(leg.eventId);
            notify(message, "error", "x-circle", 3500);
            const afterRemove = { ...betBuilderPricesByEvent.value };
            delete afterRemove[leg.eventId];
            betBuilderPricesByEvent.value = afterRemove;
            syncLegacyBetBuilderSignals(afterRemove);
            return;
          }

          betBuilderPricesByEvent.value = {
            ...betBuilderPricesByEvent.value,
            [leg.eventId]: state,
          };
          syncLegacyBetBuilderSignals(betBuilderPricesByEvent.value);
        } catch {
          if (requestSeqByEvent.current.get(leg.eventId) !== seq) return;
          betBuilderPricesByEvent.value = {
            ...betBuilderPricesByEvent.value,
            [leg.eventId]: {
              price: null,
              combinable: false,
              loading: false,
              rejectMessage: "Could not load bet builder price",
              selectionKey: betBuilderSelectionKey(leg.selections),
            },
          };
          syncLegacyBetBuilderSignals(betBuilderPricesByEvent.value);
        }
      }, 300);

      timers.push(timer);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [
    selectedOdds.value,
    selectedOdds.value
      .map((b) => `${b.eventId}:${b.marketId}:${b.oddsId}`)
      .join("|"),
  ]);
}
