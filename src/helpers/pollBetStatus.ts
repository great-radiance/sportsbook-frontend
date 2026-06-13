import { apiGetBetStatus } from "@/api/bet/apiBetDetail";
import { apiCashoutUnsubscribe } from "@/api/bet/cashout";
import { requestBetHistoryRefresh } from "@/state/sportsbookStoreHelpers";

const TERMINAL = new Set([
  "won",
  "lost",
  "voided",
  "cashed_out",
  "cancelled",
  "rejected",
]);

const POLL_MS = 7_000;

/** Poll until terminal, then refresh bet history list. */
export function startBetStatusPolling(betId: string): void {
  if (!betId) return;

  const poll = async () => {
    try {
      const data = await apiGetBetStatus(betId);
      if (TERMINAL.has(data.status)) {
        requestBetHistoryRefresh();
        await apiCashoutUnsubscribe(betId);
        return;
      }
      window.setTimeout(poll, POLL_MS);
    } catch {
      /* stop polling on hard failure */
    }
  };

  void poll();
}
