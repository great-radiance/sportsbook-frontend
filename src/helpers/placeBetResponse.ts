import type {
  PlaceBetCallResult,
  PlaceBetResult,
} from "@/api/bet/placeBet";
import { loadBetDetail } from "@/api/bet/apiBetDetail";
import { rotateBetSlipIdempotencyKey } from "@/helpers/betIdempotency";
import { startBetStatusPolling } from "@/helpers/pollBetStatus";
import { notify } from "@/shared/toast";

export type PlaceBetSideEffects = {
  clearSlip: () => void;
  onRejected: (reason: string | undefined, result: PlaceBetResult | null) => void;
  onAccepted: (betId: string) => void;
  refreshWallet: () => void;
  subscribeCashout: (betId: string) => void;
};

/** Integration guide § Step 6 — accepted, rejected, 502, 409. */
export async function handlePlaceBetCallResult(
  call: PlaceBetCallResult,
  effects: PlaceBetSideEffects,
): Promise<"accepted" | "rejected" | "partial" | "duplicate"> {
  if (call.providerRegistrationFailed || call.httpStatus === 502) {
    notify(
      "Bet placed — cashout may be unavailable. Contact support if needed.",
      "warning",
      "exclamation-triangle",
      5000,
    );
    effects.clearSlip();
    rotateBetSlipIdempotencyKey();
    return "partial";
  }

  if (call.httpStatus === 409) {
    if (call.result?.betId) {
      await loadBetDetail(call.result.betId);
      notify("This bet was already submitted.", "primary", "info-circle", 3500);
      effects.clearSlip();
      rotateBetSlipIdempotencyKey();
      return "duplicate";
    }
  }

  const result = call.result;
  if (!result) {
    return "rejected";
  }

  if (result.status === "accepted") {
    notify("Bet accepted", "success", "check2-circle", 2500);
    effects.refreshWallet();
    effects.subscribeCashout(result.betId);
    startBetStatusPolling(result.betId);
    effects.onAccepted(result.betId);
    effects.clearSlip();
    rotateBetSlipIdempotencyKey();
    return "accepted";
  }

  effects.onRejected(
    (result as { rejectionReason?: string }).rejectionReason,
    result,
  );
  rotateBetSlipIdempotencyKey();
  return "rejected";
}
