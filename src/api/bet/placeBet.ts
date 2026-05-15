import { instance } from "../instance";

/** One leg — integration guide "selection" (event + market + selection + odds). */
export type PlaceBetSelectionPayload = {
  eventId: number;
  marketId: number;
  selectionId: number;
  odds: number;
};

export type PlaceBetPayload = {
  idempotencyKey: string;
  betType: "single" | "parlay";
  stake: number;
  currency: string;
  selections: PlaceBetSelectionPayload[];
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

export type PlaceBetResponseBody = {
  data: PlaceBetAccepted | PlaceBetRejected;
};

export async function apiPlaceBet(
  payload: PlaceBetPayload,
): Promise<PlaceBetResponseBody> {
  const { data } = await instance.post<PlaceBetResponseBody>(
    "/bets/place",
    payload,
  );
  return data;
}

/** Result body inside `{ data: … }` from `POST /bets/place`. */
export type PlaceBetResult = PlaceBetAccepted | PlaceBetRejected;

/**
 * Places a bet with a stable `idempotencyKey`. On network/timeout failure,
 * retries once with the **same** key (integration guide idempotency rules).
 */
export async function apiPlaceBetWithRetry(
  payload: PlaceBetPayload,
): Promise<PlaceBetResult> {
  try {
    const res = await apiPlaceBet(payload);
    return res.data;
  } catch (firstError) {
    try {
      const res = await apiPlaceBet(payload);
      return res.data;
    } catch {
      throw firstError;
    }
  }
}
