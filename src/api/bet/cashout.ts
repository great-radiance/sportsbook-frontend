import { instance } from "../instance";
import { BetItemType, BetLegType } from "@/shared/utils/bet";
import { apiGetBetDetail } from "./apiBetDetail";

export interface CashoutOfferResponse {
  betHistory: BetItemType;
  availableCashout: number;
  canCashout: boolean;
}

export interface CashoutResponse {
  betId: string;
  cashoutAmount: number;
  cashedOutAt?: string;
  status: string;
  remainingStake?: number;
  isPartial?: boolean;
  success?: boolean;
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
  const { data } = await instance.post<CashoutResponse>(
    `/bets/${betId}/cashout`,
    {
      cashoutAmount,
      idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
    },
  );
  return data;
}

function mapBetDetailToBetItem(detail: Awaited<ReturnType<typeof apiGetBetDetail>>): BetItemType {
  const legs: BetLegType[] = (detail.selections ?? []).map((sel) => {
    const snap = sel.selectionSnapshot;
    const ev = sel.eventSnapshot;
    return {
      eventId: sel.eventId,
      sport: { id: ev?.sport?.id ?? 0, name: ev?.sport?.name ?? "" },
      region: { seqId: 0, id: null, name: null },
      league: {
        seqId: 0,
        id: ev?.competition?.id ?? null,
        name: ev?.competition?.name ?? null,
      },
      participants: ev?.name
        ? ev.name.split(/\s+vs\s+/i).map((name, i) => ({
            seqId: i,
            id: null,
            name: name.trim(),
            providerId: 0,
            providerName: "",
            home: i === 0,
          }))
        : [],
      market: { name: sel.marketSnapshot?.name ?? "" },
      odds: [
        {
          id: String(sel.selectionId),
          name: snap?.name ?? "—",
          value: sel.oddsAtPlacement,
          selected: true,
          currentValue: sel.oddsAtPlacement,
          settlement: null,
        },
      ],
    };
  });

  return {
    betId: detail.betId,
    userId: "",
    startingOdds: detail.combinedOdds,
    betType: detail.betType === "single" ? "single" : "multi",
    legs: legs.length ? legs : [],
    details: legs,
    systemType: "",
    remainingStake: detail.stakeAmount,
    autoCashoutSettings: null,
    stakeAmount: detail.stakeAmount,
    status: detail.status === "accepted" ? "pending" : detail.status,
    cashoutHistory: [],
    cashoutAmount: detail.cashoutAmount ?? null,
    cashedOutAt: detail.cashoutAt ?? null,
    placedAt: detail.createdAt,
    settledAt: detail.settledAt,
    providerResponse: { transactionId: "", code: 0, message: "" },
    metadata: { currency: detail.currency, potentialPayout: detail.potentialPayout },
  };
}

/**
 * Cashout offer for My Bets UI — uses `GET /bets/:betId` (`cashoutAmount` when available).
 */
export const getCashoutOffer = async (
  betId: string,
): Promise<CashoutOfferResponse | null> => {
  try {
    const detail = await apiGetBetDetail(betId);
    const amount = detail.cashoutAmount ?? 0;
    const canCashout =
      detail.status === "accepted" && amount > 0;
    return {
      betHistory: mapBetDetailToBetItem(detail),
      availableCashout: amount,
      canCashout,
    };
  } catch (error) {
    console.error("Error getting cashout offer:", error);
    return null;
  }
};

export const fullCashout = async (
  betId: string,
  cashoutAmount?: number,
): Promise<CashoutResponse | null> => {
  try {
    let amount = cashoutAmount;
    if (amount == null || amount <= 0) {
      const detail = await apiGetBetDetail(betId);
      amount = detail.cashoutAmount ?? 0;
    }
    if (!amount || amount <= 0) return null;
    return await apiExecuteCashout(betId, amount);
  } catch (error) {
    console.error("Error performing cashout:", error);
    return null;
  }
};

/** Partial cashout is not in the integration guide — delegates to full cashout. */
export const partialCashout = async (
  betId: string,
  _percentage: number,
): Promise<CashoutResponse | null> => fullCashout(betId);

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

/** Auto-cashout is not in the integration guide — no-op stub. */
export const setAutoCashout = async (
  _request: AutoCashoutRequest,
): Promise<AutoCashoutResponse | null> => null;
