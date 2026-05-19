import { balance, currency } from "@/state/betState";
import { getAppConfig } from "@/shared/config/appConfig";
import { refreshPlayerExposure } from "./refreshPlayerExposure";

/** Balance comes from operator config (integration guide). */
export function refreshBalanceFromConfig(): void {
  const cfg = getAppConfig();
  if (typeof cfg.xUserBalance === "number") balance.value = cfg.xUserBalance;
  if (cfg.currency) currency.value = cfg.currency;
}

/** After place bet, cashout, or wallet-affecting action. */
export async function refreshAfterWalletAction(): Promise<void> {
  refreshBalanceFromConfig();
  await refreshPlayerExposure();
}
