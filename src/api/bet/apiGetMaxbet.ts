import { getAppConfig } from "@/shared/config/appConfig";
import { hasPlayerSessionUserId, instance } from "../instance";
import type { PlaceBetSelectionPayload } from "./placeBet";

export type MaxBetRequest = {
  betType: "single" | "parlay";
  currency?: string;
  selections: PlaceBetSelectionPayload[];
};

export type MaxBetResult = {
  maxBet: number;
};

export async function apiGetMaxBet(
  payload: MaxBetRequest,
): Promise<MaxBetResult | unknown> {
  if (!hasPlayerSessionUserId()) {
    return Promise.reject(new Error("Missing player session: x-user-id"));
  }

  const response = await instance.post("users/bets/max-bet", {
    betType: payload.betType,
    currency: payload.currency ?? getAppConfig().currency,
    selections: payload.selections,
  });
  return response.data;
}
