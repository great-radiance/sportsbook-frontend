import axios from "axios";
import { instance } from "../instance";
import { useCopyToClipboard } from "usehooks-ts";
import { BetContextRef } from "@/shared/utils/bet";
import { tParticipant } from "@/types/tEvent";

/** Slip snapshot stored on the bet and returned in history `description`. */
export type PlaceBetDescriptionItem = {
  sport: BetContextRef;
  region: BetContextRef;
  league: BetContextRef;
  oddsId: string;
  name: string;
  marketId: number;
  eventId: number;
  marketName: string;
  participants: tParticipant[];
  startDate: number;
};

/** One leg — integration guide "selection" (event + market + selection + odds). */
export type PlaceBetSelectionPayload = {
  eventId: number;
  marketId: number;
  selectionId: number;
  odds: number;
  betBuilderBetItems?: Array<{
    marketId: number;
    selectionId: number;
  }>;
};

export type PlaceBetPayload = {
  idempotencyKey: string;
  betType: "single" | "parlay" | "system";
  stake: number;
  currency: string;
  selections: PlaceBetSelectionPayload[];
  systemMinCombination?: number;
  description?: PlaceBetDescriptionItem[];
};

export type PlaceBetAccepted = {
  betId: string;
  status: "accepted";
  betType: string;
  stakeAmount: number;
  potentialPayout: number;
  combinedOdds: number;
  currency: string;
  createdAt: string;
};

export type PlaceBetRejected = {
  betId: string;
  status: "rejected";
  rejectionReason: string;
};

export type PlaceBetResult = PlaceBetAccepted | PlaceBetRejected;

export type PlaceBetCallResult = {
  httpStatus: number;
  result: PlaceBetResult | null;
  /** HTTP 502 — bet accepted server-side but provider registration failed. */
  providerRegistrationFailed?: boolean;
};

function unwrapPlaceBetResponse(body: unknown): PlaceBetResult {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: PlaceBetResult }).data;
  }
  return body as PlaceBetResult;
}

export async function apiPlaceBet(
  payload: PlaceBetPayload,
): Promise<PlaceBetCallResult> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload));
    const { data, status } = await instance.post<
      PlaceBetResult | { data: PlaceBetResult }
    >("users/bets/place", payload);
    return {
      httpStatus: status,
      result: unwrapPlaceBetResponse(data),
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      const status = err.response.status;
      if (status === 502) {
        return {
          httpStatus: 502,
          result: null,
          providerRegistrationFailed: true,
        };
      }
      if (status === 409) {
        const body = err.response.data as
          | PlaceBetResult
          | { data?: PlaceBetResult };
        const result =
          body && typeof body === "object" && "data" in body
            ? (body.data ?? null)
            : (body as PlaceBetResult);
        return { httpStatus: 409, result: result ?? null };
      }
    }
    throw err;
  }
}

/**
 * Places a bet with a stable `idempotencyKey`. On network/timeout failure,
 * retries once with the **same** key (integration guide § Step 9).
 */
export async function apiPlaceBetWithRetry(
  payload: PlaceBetPayload,
): Promise<PlaceBetCallResult> {
  try {
    return await apiPlaceBet(payload);
  } catch (firstError) {
    try {
      return await apiPlaceBet(payload);
    } catch {
      throw firstError;
    }
  }
}
