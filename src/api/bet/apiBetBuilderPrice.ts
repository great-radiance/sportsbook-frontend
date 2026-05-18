import { instance } from "../instance";

export type BetBuilderPriceLeg = {
  marketId: number;
  selectionId: number;
};

export type BetBuilderPriceRequest = {
  requestId: string;
  segmentId: number;
  eventId: number;
  bets: BetBuilderPriceLeg[];
};

export type BetBuilderRejectInfo = {
  reason: number;
  message: string;
  maxBet?: number;
  alternativeOdds?: unknown;
};

export type BetBuilderPriceResult = {
  requestId: string;
  price?: number;
  timeStamp: string;
  rejectInfo: BetBuilderRejectInfo | null;
};

/** `POST /odds88/bet-builder/price` */
export async function apiBetBuilderPrice(
  payload: BetBuilderPriceRequest,
): Promise<BetBuilderPriceResult> {
  const { data } = await instance.post<{ data: BetBuilderPriceResult }>(
    "/odds88/bet-builder/price",
    payload,
  );
  return data.data;
}

export function isBetBuilderCombinable(result: BetBuilderPriceResult): boolean {
  return (
    result.rejectInfo == null &&
    typeof result.price === "number" &&
    Number.isFinite(result.price) &&
    result.price > 1
  );
}

export function betBuilderRejectMessage(
  rejectInfo: BetBuilderRejectInfo | null | undefined,
): string {
  if (!rejectInfo) return "Bet builder price unavailable";
  switch (rejectInfo.reason) {
    case 1:
      return rejectInfo.message || "A selection is unavailable";
    case 2:
      return rejectInfo.message || "Stake above maximum";
    case 3:
      return rejectInfo.message || "These selections cannot be combined";
    case 4:
      return rejectInfo.message || "Alternative odds are available";
    default:
      return rejectInfo.message || "Bet builder rejected";
  }
}
