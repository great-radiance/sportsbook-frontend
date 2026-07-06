import { isCashoutableStatus } from "@/helpers/betStatus";
import { autoPrintAcceptedBetTicket } from "@/helpers/autoPrintAcceptedBetTicket";
import { requestBetHistoryRefresh } from "@/state/sportsbookStoreHelpers";
import { sportsbookStore } from "@/state/sportsbookStoreContext";
import type { BetItemType } from "@/shared/utils/bet";

const { isMobile, betHistoryState, openBetsTabState, isOpenedMyBet } =
  sportsbookStore;

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

/** After accept — switch to Open Bets, refetch history, and print updated receipt. */
export async function showAcceptedBetInOpenBets(
  betId?: string,
  options?: { autoPrint?: boolean },
): Promise<void> {
  openBetsTabState.value = "open";
  requestBetHistoryRefresh();

  if (isMobile.value) {
    isOpenedMyBet.value = true;
  }

  if (betId && options?.autoPrint !== false) {
    void autoPrintAcceptedBetTicket(betId);
  }
}
