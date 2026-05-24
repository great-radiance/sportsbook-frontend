import { instance } from "../instance";
import { unwrapApiData } from "../unwrapApiData";
import { getAppConfig } from "@/shared/config/appConfig";
import { mapBetDetailToBetItem } from "./mapBetDetail";
import type { BetItemType } from "@/shared/utils/bet";

export type BetBuilderBetItem = {
  marketId: number;
  selectionId: number;
  marketName?: string;
  selectionName?: string;
};

export type BetDetailSelection = {
  selectionId: number;
  eventId: number;
  marketId: number;
  status: string;
  isBetBuilder?: boolean;
  betBuilderBetItems?: BetBuilderBetItem[];
  eventName?: string;
  marketName?: string;
  selectionName?: string;
  settlementResult?: string | null;
  oddsAtPlacement: number;
  currentOdds?: number;
  stakePortion?: number;
  potentialPayout?: number;
  actualPayout?: number | null;
  settledAt?: string | null;
  eventSnapshot?: {
    id?: number;
    name?: string;
    status?: number;
    tradingStatus?: number;
    statusDescription?: string;
    sport?: { id?: number; name?: string };
    country?: { id?: number; name?: string };
    competition?: { id?: number; name?: string };
    season?: unknown;
    competitors?: { id?: number; name?: string }[];
    startTime?: string;
    isOutright?: boolean;
    isBetBuilderSupported?: boolean;
    mappingInfo?: { feedId: number; id: string }[];
  };
  marketSnapshot?: { id?: number; name?: string; type?: number };
  selectionSnapshot?: {
    id?: number;
    name?: string;
    odds?: number;
    price?: number;
  };
};

export type BetDetail = {
  betId: string;
  betType: string;
  status: string;
  shortResult?: string;
  stakeAmount: number;
  potentialPayout: number;
  actualPayout: number | null;
  combinedOdds: number;
  currency: string;
  selectionCount?: number;
  walletReserveRef?: string | null;
  createdAt: string;
  acceptedAt?: string | null;
  settledAt?: string | null;
  cashoutAmount?: number | null;
  cashoutAt?: string | null;
  rejectionReason?: string | null;
  selections?: BetDetailSelection[];
  statusTimeline?: unknown[];
  walletTransactions?: unknown[];
};

const detailInFlight = new Map<string, Promise<BetItemType | null>>();

/** `GET /bets/:betId` */
export async function apiGetBetDetail(betId: string): Promise<BetDetail> {
  const { data } = await instance.get<BetDetail | { data: BetDetail }>(
    `/bets/${betId}`,
  );
  return unwrapApiData<BetDetail>(data);
}

/** `GET /bets/:betId/status` */
export async function apiGetBetStatus(betId: string): Promise<{
  betId: string;
  status: string;
  updatedAt: string;
}> {
  const { data } = await instance.get<
    | { betId: string; status: string; updatedAt: string }
    | { data: { betId: string; status: string; updatedAt: string } }
  >(`/bets/${betId}/status`);
  return unwrapApiData(data);
}

async function fetchBetDetailForUi(betId: string): Promise<BetItemType | null> {
  try {
    const detail = await apiGetBetDetail(betId);
    const bet = mapBetDetailToBetItem(detail);

    return bet;
  } catch (error) {
    console.error("GET /bets/:betId failed:", error);
    return null;
  }
}

/** Load full bet receipt + cashout subscribe (deduped per `betId`). */
export async function loadBetDetail(
  betId: string,
): Promise<BetItemType | null> {
  const inFlight = detailInFlight.get(betId);
  if (inFlight) return inFlight;

  const promise = fetchBetDetailForUi(betId).finally(() => {
    detailInFlight.delete(betId);
  });
  detailInFlight.set(betId, promise);
  return promise;
}
