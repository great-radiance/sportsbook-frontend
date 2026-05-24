import { balance, currency } from "@/state/betState";
import { getAppConfig } from "@/shared/config/appConfig";
import { apiGetSportsbookBalance } from "@/api/bet/apiSportsbookBalance";
import { refreshPlayerExposure } from "./refreshPlayerExposure";

/** Balance from operator backend when available; otherwise embed config. */
export function refreshBalanceFromConfig(): void {
  const cfg = getAppConfig();
  if (typeof cfg.xUserBalance === "number") balance.value = cfg.xUserBalance;
  if (cfg.currency) currency.value = cfg.currency;
}

export async function refreshBalanceFromOperator(): Promise<void> {
  try {
    const resp = await apiGetSportsbookBalance();
    if (typeof resp.balance === "number" && Number.isFinite(resp.balance)) {
      balance.value = resp.balance;
    }
    if (resp.currency) currency.value = resp.currency;
  } catch {
    refreshBalanceFromConfig();
  }
}

/** After place bet, cashout, or wallet-affecting action. */
export async function refreshAfterWalletAction(): Promise<void> {
  await refreshBalanceFromOperator();
  await refreshPlayerExposure();
}
