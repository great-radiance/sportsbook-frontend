import axios from "axios";
import {
  apiGetUsersMe,
  apiGetUsersMeExposure,
  apiGetUsersMeLimits,
  type UserExposure,
  type UserLimits,
  type UserMe,
} from "@/api/user/apiUsersMe";
import { apiGetSportsbookBalance } from "@/api/bet/apiSportsbookBalance";
import { sportsbookStore } from "@/state/sportsbookStoreContext";
import { refreshBalanceFromConfig } from "@/helpers/refreshPlayerWallet";

const { balance, currency, playerExposure, playerLimits, playerProfile } =
  sportsbookStore;

export type PlayerSessionLoadResult = {
  ok: boolean;
  notFound?: boolean;
};

/** Integration guide § Player Session — parallel profile, limits, exposure, balance. */
export async function loadPlayerSession(): Promise<PlayerSessionLoadResult> {
  refreshBalanceFromConfig();

  const [meResult, limits, exposure, balanceResp] = await Promise.all([
    apiGetUsersMe()
      .then((data) => ({ ok: true as const, data }))
      .catch((err: unknown) => ({ ok: false as const, err })),
    apiGetUsersMeLimits().catch(() => null),
    apiGetUsersMeExposure().catch(() => null),
    apiGetSportsbookBalance().catch(() => null),
  ]);

  applyBalance(balanceResp?.balance, balanceResp?.currency);
  playerLimits.value = limits as UserLimits | null;
  playerExposure.value = exposure as UserExposure | null;

  if (meResult.ok) {
    applyProfile(meResult.data);
    return { ok: true };
  }

  playerProfile.value = null;
  const status = axios.isAxiosError(meResult.err)
    ? meResult.err.response?.status
    : undefined;
  if (status === 404) return { ok: false, notFound: true };
  return { ok: false };
}

export async function refreshPlayerProfile(): Promise<UserMe | null> {
  try {
    const me = await apiGetUsersMe();
    applyProfile(me);
    return me;
  } catch {
    return playerProfile.value;
  }
}

function applyProfile(me: UserMe): void {
  playerProfile.value = me;
  if (me.currency) currency.value = me.currency;
}

function applyBalance(nextBalance?: number, nextCurrency?: string): void {
  if (typeof nextBalance === "number" && Number.isFinite(nextBalance)) {
    balance.value = nextBalance;
  } else {
    refreshBalanceFromConfig();
  }
  if (nextCurrency) currency.value = nextCurrency;
}
