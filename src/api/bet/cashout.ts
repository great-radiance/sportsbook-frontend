import { instance } from "../instance";
import { BetItemType } from "@/shared/utils/bet";

export interface CashoutOfferResponse {
  betHistory: BetItemType;
  availableCashout: number;
  canCashout: boolean;
}

export interface CashoutResponse {
  betId: string;
  cashoutAmount: number;
  cashedOutAt: string;
  status: string;
  remainingStake: number;
  isPartial: boolean;
}

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

export const getCashoutOffer = async (
  betId: string,
): Promise<CashoutOfferResponse | null> => {
  try {
    const response = await instance.get<CashoutOfferResponse>(
      `/cybet/cashout/${betId}/cashout-offer`,
    );
    return response.data;
  } catch (error) {
    console.error("Error getting cashout offer:", error);
    return null;
  }
};

export const fullCashout = async (
  betId: string,
): Promise<CashoutResponse | null> => {
  try {
    const response = await instance.post<CashoutResponse>(
      `/cybet/cashout/${betId}/cashout`,
      { betId },
    );
    return response.data;
  } catch (error) {
    console.error("Error performing full cashout:", error);
    return null;
  }
};

export const partialCashout = async (
  betId: string,
  percentage: number,
): Promise<CashoutResponse | null> => {
  try {
    const response = await instance.post<CashoutResponse>(
      `/cybet/cashout/${betId}/partial-cashout`,
      { betId, percentage },
    );
    return response.data;
  } catch (error) {
    console.error("Error performing partial cashout:", error);
    return null;
  }
};

export const setAutoCashout = async (
  request: AutoCashoutRequest,
): Promise<AutoCashoutResponse | null> => {
  try {
    const response = await instance.post<AutoCashoutResponse>(
      `/cybet/cashout/${request.betId}/auto-cashout`,
      request,
    );
    return response.data;
  } catch (error) {
    console.error("Error setting auto cashout:", error);
    return null;
  }
};
