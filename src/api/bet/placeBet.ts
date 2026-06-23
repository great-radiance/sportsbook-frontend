import axios from "axios";
import { instance } from "../instance";
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

export type SystemCombinationPayload = {
  size: number;
  stake: number;
};

export type PlaceBetPayload = {
  idempotencyKey: string;
  betType: "single" | "parlay" | "system";
  stake: number;
  currency: string;
  selections: PlaceBetSelectionPayload[];
  /** @deprecated Use systemCombinations for per-size stakes */
  systemMinCombination?: number;
  systemCombinations?: SystemCombinationPayload[];
  description?: PlaceBetDescriptionItem[];
};

export type PlaceBetSystemAccepted = {
  _id?: string;
  systemGroupId: string;
  betType: "system";
  systemType?: string;
  unitStake?: number | null;
  systemCombinations?: Array<SystemCombinationPayload & { count?: number }> | null;
  totalStake: number;
  combinationCount: number;
  currency: string;
  status?: "accepted";
  subBets?: Array<{
    betId: string;
    stakeAmount: number;
    potentialPayout: number;
    combinedOdds: number;
    status: string;
    selections: PlaceBetSelectionPayload[];
    createdAt: string;
  }>;
  createdAt: string;
};

export type PlaceBetAccepted = {
  betId?: string;
  systemGroupId?: string;
  status: "accepted";
  betType: string;
  stakeAmount?: number;
  potentialPayout?: number;
  combinedOdds?: number;
  totalStake?: number;
  combinationCount?: number;
  systemType?: string;
  currency: string;
  createdAt: string;
};

export type PlaceBetRejected = {
  betId?: string;
  status: "rejected";
  rejectionReason: string;
};

export type PlaceBetResult =
  | PlaceBetAccepted
  | PlaceBetRejected
  | PlaceBetSystemAccepted;

export type PlaceBetCallResult = {
  httpStatus: number;
  result: PlaceBetResult | null;
  /** HTTP 502 — bet accepted server-side but provider registration failed. */
  providerRegistrationFailed?: boolean;
};

export function isPlaceBetRejected(
  result: PlaceBetResult | null | undefined,
): result is PlaceBetRejected {
  return result?.status === "rejected";
}

/** Accepted single/parlay (`status`) or system group (`systemGroupId` / `_id`, no top-level status). */
export function isPlaceBetAccepted(
  result: PlaceBetResult | null | undefined,
): result is PlaceBetAccepted | PlaceBetSystemAccepted {
  if (!result || isPlaceBetRejected(result)) return false;
  if (result.status === "accepted") return true;
  const system = result as PlaceBetSystemAccepted;
  return Boolean(system.systemGroupId || system._id);
}

export function placeBetAcceptedReference(
  result: PlaceBetResult | null | undefined,
): string | undefined {
  if (!isPlaceBetAccepted(result)) return undefined;
  const system = result as PlaceBetSystemAccepted;
  if (system.systemGroupId) return system.systemGroupId;
  if (system._id) return system._id;
  return (result as PlaceBetAccepted).betId;
}

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
