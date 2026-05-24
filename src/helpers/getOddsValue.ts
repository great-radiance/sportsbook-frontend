import {
  selectionStoreKey,
  selectionsStoreState,
  storeState,
} from "@/state/storeState";
import { Signal } from "@preact/signals";

/** Live market or widget/home cache entry exists for this selection. */
export function hasSelectionOddsSource(
  eventId: number,
  marketId: number,
  oddId: number,
): boolean {
  const idNum = Number(oddId);
  const selections =
    storeState.value[eventId]?.value?.markets?.[marketId]?.value?.selections;
  if (selections?.some((s) => s.value?.id === idNum)) return true;
  return !!selectionsStoreState.value[
    selectionStoreKey(eventId, marketId, oddId)
  ];
}

export const getOddsValue = (
  eventId: number,
  marketId: number,
  oddId: number,
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
  const key = selectionStoreKey(eventId, marketId, oddId);
  const oddSig = selectionsStoreState.value[key];
  if (oddSig && typeof oddSig === "object" && "value" in oddSig) {
    return (oddSig as Signal<{ price: number }>).value?.price ?? 0;
  }
  return 0;
};

export const getOddsMv = (
  eventId: number,
  marketId: number,
  oddId: number,
): number => {
  const marketSig = storeState.value[eventId]?.value?.markets?.[marketId];
  const selections = marketSig?.value?.selections;
  const idNum = Number(oddId);
  if (selections?.length) {
    const selSig = selections.find((s) => s.value?.id === idNum);
    if (selSig && typeof selSig === "object" && "value" in selSig) {
      return selSig.value.mv ?? 0;
    }
  }
  const key = selectionStoreKey(eventId, marketId, oddId);
  const oddSig = selectionsStoreState.value[key];
  if (oddSig && typeof oddSig === "object" && "value" in oddSig) {
    return (oddSig as Signal<{ mv?: number }>).value?.mv ?? 0;
  }
  return 0;
};
