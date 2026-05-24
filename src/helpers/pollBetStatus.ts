import { apiGetBetStatus } from "@/api/bet/apiBetDetail";
import { loadBetDetail } from "@/api/bet/apiBetDetail";
import { apiCashoutUnsubscribe } from "@/api/bet/cashout";

const TERMINAL = new Set([
  "won",
  "lost",
  "voided",
  "cashed_out",
  "cancelled",
  "rejected",
]);

const POLL_MS = 7_000;

/** Integration guide § Step 7c — poll until terminal, then load full detail. */
export function startBetStatusPolling(betId: string): void {
  if (!betId) return;

  const poll = async () => {
    try {
      const data = await apiGetBetStatus(betId);
      if (TERMINAL.has(data.status)) {
        await loadBetDetail(betId);
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
