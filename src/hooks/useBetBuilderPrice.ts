import { useEffect, useRef } from "preact/hooks";
import {
  apiBetBuilderPrice,
  betBuilderRejectMessage as formatReject,
  isBetBuilderCombinable,
} from "@/api/bet/apiBetBuilderPrice";
import {
  sportsbookStore,
} from "@/state/sportsbookStoreContext";

const {
  betBuilderCombinable,
  betBuilderPrice,
  betBuilderPriceLoading,
  betBuilderRejectMessage,
  isBuilding,
  selectedOdds,
} = sportsbookStore;

const DEFAULT_SEGMENT_ID = 2359;

/**
 * Fetches `POST /odds88/bet-builder/price` when bet-builder selections change.
 */
export function useBetBuilderPriceSync() {
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!isBuilding.value) {
      betBuilderPrice.value = null;
      betBuilderCombinable.value = false;
      betBuilderRejectMessage.value = null;
      betBuilderPriceLoading.value = false;
      return;
    }

    const building = selectedOdds.value.filter((o) => o.isBuilding);
    if (building.length < 2) {
      betBuilderPrice.value = null;
      betBuilderCombinable.value = false;
      betBuilderRejectMessage.value = null;
      betBuilderPriceLoading.value = false;
      return;
    }

    const eventId = building[0].eventId;
    if (!building.every((b) => b.eventId === eventId)) {
      betBuilderCombinable.value = false;
      betBuilderRejectMessage.value =
        "Bet builder selections must be from the same event";
      betBuilderPrice.value = null;
      return;
    }

    const seq = ++requestSeq.current;

    const timer = window.setTimeout(async () => {
      betBuilderPriceLoading.value = true;
      try {
        const result = await apiBetBuilderPrice({
          // requestId: crypto.randomUUID(),
          // segmentId: DEFAULT_SEGMENT_ID,
          eventId,
          bets: building.map((b) => ({
            marketId: b.apiMarketId ?? Number(b.marketId),
            selectionId: b.apiSelectionId ?? Number(b.oddsId),
          })),
        });
        if (seq !== requestSeq.current) return;

        if (isBetBuilderCombinable(result)) {
          betBuilderPrice.value = result.price ?? null;
          betBuilderCombinable.value = true;
          betBuilderRejectMessage.value = null;
        } else {
          betBuilderPrice.value = null;
          betBuilderCombinable.value = false;
          betBuilderRejectMessage.value = formatReject(result.rejectInfo);
        }
      } catch {
        if (seq !== requestSeq.current) return;
        betBuilderPrice.value = null;
        betBuilderCombinable.value = false;
        betBuilderRejectMessage.value = "Could not load bet builder price";
      } finally {
        if (seq === requestSeq.current) {
          betBuilderPriceLoading.value = false;
        }
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    isBuilding.value,
    selectedOdds.value,
    selectedOdds.value
      .filter((o) => o.isBuilding)
      .map((b) => `${b.eventId}:${b.marketId}:${b.oddsId}`)
      .join("|"),
  ]);
}
