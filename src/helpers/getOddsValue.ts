import { selectionsStoreState, storeState } from "@/state/storeState";
import { Signal } from "@preact/signals";

export const getOddsValue = (
  eventId: number,
  marketId: string,
  oddId: string,
): number => {
  const marketSig = storeState.value[eventId]?.value?.markets?.[marketId];
  const odds = marketSig?.value?.selections?.selections;
  const oddSig =
    odds?.[parseInt(oddId)] || selectionsStoreState.value[parseInt(oddId)];
  if (oddSig && typeof oddSig === "object" && "value" in oddSig) {
    return (oddSig as Signal<{ value: number }>).value?.price ?? 1;
  }
  return 1;
};
