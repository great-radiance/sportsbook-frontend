import { isCashoutableStatus } from "@/helpers/betStatus";
import { isMobile } from "@/state/isMobile";
import {
  betHistoryState,
  openBetsTabState,
  requestBetHistoryRefresh,
} from "@/state/betHistoryState";
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
  if (
    !isOpenBetsListStatus(bet.status) &&
    !isCashoutableStatus(bet.status)
  ) {
    return;
  }

  betHistoryState.value = [
    bet,
    ...betHistoryState.value.filter((b) => b.betId !== bet.betId),
  ];
}

/** After accept — switch to Open Bets and refetch history (uses `description` on each row). */
export async function showAcceptedBetInOpenBets(
  _betId?: string,
): Promise<void> {
  openBetsTabState.value = "open";
  requestBetHistoryRefresh();

  if (isMobile.value) {
    isOpenedMyBet.value = true;
  }
}
