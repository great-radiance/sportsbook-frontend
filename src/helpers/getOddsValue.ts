import { selectionsStoreState, storeState } from "@/state/storeState";
import { Signal } from "@preact/signals";

export const getOddsValue = (
  eventId: number,
  marketId: string,
  oddId: string,
): number => {
  const marketSig = storeState.value[eventId]?.value?.markets?.[marketId];
  const selections = marketSig?.value?.selections;
  const idNum = Number(oddId);
  if (selections?.length) {
    const selSig = selections.find((s) => s.value?.id === idNum);
    if (selSig && typeof selSig === "object" && "value" in selSig) {
      return selSig.value.price ?? 1;
    }
  }
  const oddSig = selectionsStoreState.value[oddId];
  if (oddSig && typeof oddSig === "object" && "value" in oddSig) {
    return (oddSig as Signal<{ price: number }>).value?.price ?? 1;
  }
  return 1;
};
