import {
  apiGetActiveBonus,
  type ActiveFreeBet,
} from "@/api/bonuses/apiGetActiveBonus";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

export function activeFreeBetForCurrency(currency: string): ActiveFreeBet | null {
  const active = sportsbookStore.activeFreeBet.value;
  if (!active || active.currency !== currency) return null;
  return active;
}

export function isFreeBetStakeLocked(currency: string): boolean {
  return activeFreeBetForCurrency(currency) != null;
}

/** Pre-fill slip stakes when an unused free bet applies to this currency. */
export function applyActiveFreeBetStakeToSlip(currency: string): void {
  const active = activeFreeBetForCurrency(currency);
  if (!active) return;

  sportsbookStore.multipleBetAmount.value = active.freebetAmount;
  if (sportsbookStore.selectedOdds.value.length === 0) return;

  sportsbookStore.selectedOdds.value = sportsbookStore.selectedOdds.value.map(
    (odd) => ({ ...odd, amount: active.freebetAmount }),
  );
}

export async function refreshActiveFreeBet(): Promise<ActiveFreeBet | null> {
  try {
    const active = await apiGetActiveBonus();
    sportsbookStore.activeFreeBet.value = active;
    return active;
  } catch {
    sportsbookStore.activeFreeBet.value = null;
    return null;
  }
}
