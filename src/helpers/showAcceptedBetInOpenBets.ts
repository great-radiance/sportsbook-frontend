import { loadBetDetail } from "@/api/bet/apiBetDetail";
import { isCashoutableStatus } from "@/helpers/betStatus";
import { isMobile } from "@/state/isMobile";
import { betHistoryState, openBetsTabState } from "@/state/betHistoryState";
import { isOpenedMyBet } from "@/state/betState";
import type { BetItemType } from "@/shared/utils/bet";

const OPEN_BETS_LIST_STATUSES = new Set([
  "accepted",
  "pending",
  "partially_cashed_out",
]);

export function isOpenBetsListStatus(status: string): boolean {
  return OPEN_BETS_LIST_STATUSES.has(status);
}

/** Prepend or replace a bet in the open-bets list (sidebar). */
export function upsertOpenBetInHistory(bet: BetItemType): void {
  betHistoryState.value = [
    bet,
    ...betHistoryState.value.filter((b) => b.betId !== bet.betId),
  ];
}

/**
 * Integration guide Step 6–7: after `status === "accepted"`, load `GET /bets/:betId`
 * and show the bet under Open Bets.
 */
export async function showAcceptedBetInOpenBets(
  betId: string,
): Promise<void> {
  if (!betId) return;

  const bet = await loadBetDetail(betId);
  if (!bet) return;
  if (!isOpenBetsListStatus(bet.status) && !isCashoutableStatus(bet.status)) {
    return;
  }

  upsertOpenBetInHistory(bet);
  openBetsTabState.value = "open";

  if (isMobile.value) {
    isOpenedMyBet.value = true;
  }
}
