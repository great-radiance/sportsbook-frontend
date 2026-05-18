import { instance } from "../instance";

export type BetDetailSelection = {
  selectionId: number;
  eventId: number;
  marketId: number;
  status: string;
  oddsAtPlacement: number;
  eventSnapshot?: {
    id?: number;
    name?: string;
    sport?: { id?: number; name?: string };
    competition?: { id?: number; name?: string };
  };
  marketSnapshot?: { id?: number; name?: string };
  selectionSnapshot?: { id?: number; name?: string; odds?: number };
};

export type BetDetail = {
  betId: string;
  betType: string;
  status: string;
  stakeAmount: number;
  potentialPayout: number;
  actualPayout: number | null;
  combinedOdds: number;
  currency: string;
  createdAt: string;
  acceptedAt?: string | null;
  settledAt?: string | null;
  cashoutAmount?: number | null;
  cashoutAt?: string | null;
  selections?: BetDetailSelection[];
};

function unwrapData<T>(body: unknown): T {
  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** `GET /bets/:betId` */
export async function apiGetBetDetail(betId: string): Promise<BetDetail> {
  const { data } = await instance.get<BetDetail | { data: BetDetail }>(
    `/bets/${betId}`,
  );
  return unwrapData<BetDetail>(data);
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
  return unwrapData(data);
}
