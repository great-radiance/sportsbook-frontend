import {
  betBuilderCombinable,
  betBuilderPrice,
  betBuilderRejectMessage,
  isBuilding,
  selectedOdds,
} from "@/state/betState";

/** Toggle bet-builder mode (same behaviour as MarketsBoard switch). */
export function setBetBuilderMode(enabled: boolean): void {
  isBuilding.value = enabled;
  if (!enabled) {
    selectedOdds.value = selectedOdds.value.filter((o) => !o.isBuilding);
    betBuilderPrice.value = null;
    betBuilderCombinable.value = false;
    betBuilderRejectMessage.value = null;
  }
}
