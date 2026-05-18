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

export type PlaceBetResult = PlaceBetAccepted | PlaceBetRejected;

function unwrapPlaceBetResponse(body: unknown): PlaceBetResult {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: PlaceBetResult }).data;
  }
  return body as PlaceBetResult;
}

export async function apiPlaceBet(
  payload: PlaceBetPayload,
): Promise<PlaceBetResult> {
  const { data } = await instance.post<PlaceBetResult | { data: PlaceBetResult }>(
    "/bets/place",
    payload,
  );
  return unwrapPlaceBetResponse(data);
}

/**
 * Places a bet with a stable `idempotencyKey`. On network/timeout failure,
 * retries once with the **same** key (integration guide idempotency rules).
 */
export async function apiPlaceBetWithRetry(
  payload: PlaceBetPayload,
): Promise<PlaceBetResult> {
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
