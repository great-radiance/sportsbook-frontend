import { oddsStoreState, storeState } from "@/state/storeState";
import { Signal } from "@preact/signals";

export const getOddsValue = (
  eventId: number,
  marketId: string,
  oddId: string,
): number => {
  const marketSig = storeState.value[eventId]?.value?.markets?.[marketId];
  const odds = marketSig?.value?.odds?.odds;
  const oddSig = odds?.[oddId] || oddsStoreState.value[oddId];
  if (oddSig && typeof oddSig === "object" && "value" in oddSig) {
    if (oddSig.value.status === "suspended") {
      return 0;
    }
    if (oddSig.value.status === "deleted") {
      return -1;
    }
    return (oddSig as Signal<{ value: number }>).value?.value ?? 1;
  }
  return 1;
};
