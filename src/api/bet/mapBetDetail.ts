import { BetItemType } from "@/shared/utils/bet";
import type { BetDetail } from "./apiBetDetail";
import { mapSelectionsToBetLegs } from "./mapBetSelections";

function mapBetTypeFromApi(api: string): BetItemType["betType"] {
  if (api === "single") return "single";
  if (api === "parlay") return "multi";
  return "multi";
}

/** Map `GET /bets/:betId` to bet-slip `BetItemType` (API status unchanged). */
export function mapBetDetailToBetItem(detail: BetDetail): BetItemType {
  const legs = mapSelectionsToBetLegs(detail.selections);

  return {
    betId: detail.betId,
    userId: "",
    startingOdds: detail.combinedOdds,
    betType: mapBetTypeFromApi(detail.betType),
    legs,
    details: legs,
    systemType: "",
    remainingStake: detail.stakeAmount,
    autoCashoutSettings: null,
    stakeAmount: detail.stakeAmount,
    status: detail.status,
    cashoutHistory: [],
    cashoutAmount: detail.cashoutAmount ?? null,
    cashedOutAt: detail.cashoutAt ?? null,
    placedAt: detail.createdAt,
    settledAt: detail.settledAt ?? null,
    providerResponse: { transactionId: "", code: 0, message: "" },
    metadata: {
      currency: detail.currency,
      potentialPayout: detail.potentialPayout,
      actualPayout: detail.actualPayout,
      apiCashoutAmount:
        detail.cashoutAmount != null && detail.cashoutAmount > 0
          ? detail.cashoutAmount
          : null,
    },
  };
}
