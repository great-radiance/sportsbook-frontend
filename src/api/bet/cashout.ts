import axios from "axios";
import { instance } from "../instance";
import { unwrapApiData } from "../unwrapApiData";
import { getMaxCashoutAmount } from "@/helpers/betStatus";
import { BetItemType } from "@/shared/utils/bet";

/** Pulls the human-readable message from an axios error body `{ error: "..." }` or `{ message: "..." }`. */
export function extractApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { error?: unknown; message?: unknown }
      | undefined;
    const raw =
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : null;
    if (raw && raw.trim()) return raw.trim();
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export interface CashoutResponse {
  success?: boolean;
  betId: string;
  cashoutAmount: number;
  status: string;
  cashedOutAt?: string;
  remainingStake?: number;
  isPartial?: boolean;
}

/** `POST /odds88/cashout/subscribe` */
export async function apiCashoutSubscribe(
  betSlipId: string,
  playerId: string,
): Promise<void> {
  await instance.post("/odds88/cashout/subscribe", { betSlipId, playerId });
}

/** `POST /odds88/cashout/unsubscribe` */
export async function apiCashoutUnsubscribe(betSlipId: string): Promise<void> {
  await instance.post("/odds88/cashout/unsubscribe", { betSlipId });
}

/** `POST /bets/:betId/cashout` */
export async function apiExecuteCashout(
  betId: string,
  cashoutAmount: number,
  idempotencyKey?: string,
): Promise<CashoutResponse> {
  const { data } = await instance.post<
    CashoutResponse | { data: CashoutResponse }
  >(
    `users/bets/${betId}/cashout`,
    {
      cashoutAmount,
      idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
    },
    { params: { betId } },
  );
  return unwrapApiData<CashoutResponse>(data);
}

export function cashoutAmountForBet(bet: BetItemType): number {
  const apiAmount =
    typeof bet.metadata?.apiCashoutAmount === "number"
      ? bet.metadata.apiCashoutAmount
      : null;
  return getMaxCashoutAmount(bet.stakeAmount, apiAmount);
}

/**
 * Throws on failure so the caller can show the backend's error message
 * (e.g. `{ "error": "Bet is settled." }`). Returns `null` only when no
 * request was attempted (invalid amount).
 */
export const fullCashout = async (
  betId: string,
  cashoutAmount: number,
): Promise<CashoutResponse | null> => {
  if (!cashoutAmount || cashoutAmount <= 0) return null;
  return apiExecuteCashout(betId, cashoutAmount);
};

/** Partial cashout is not in the integration guide — full amount only. */
export const partialCashout = async (
  betId: string,
  cashoutAmount: number,
): Promise<CashoutResponse | null> => fullCashout(betId, cashoutAmount);

export interface AutoCashoutRequest {
  betId: string;
  enabled: boolean;
  type: "winning_amount" | "losing_amount" | "percentage";
  targetValue: number;
  isPartial?: boolean;
  partialPercentage?: number;
}

export interface AutoCashoutResponse {
  betId: string;
  autoCashoutSettings: {
    enabled: boolean;
    type: string;
    targetValue: number;
    isPartial: boolean;
    partialPercentage?: number;
  } | null;
}

/** Not in integration guide — no-op. */
export const setAutoCashout = async (
  _request: AutoCashoutRequest,
): Promise<AutoCashoutResponse | null> => null;
