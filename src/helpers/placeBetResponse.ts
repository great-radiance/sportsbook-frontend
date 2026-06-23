import type {
  PlaceBetCallResult,
  PlaceBetResult,
} from "@/api/bet/placeBet";
import {
  isPlaceBetAccepted,
  isPlaceBetRejected,
  placeBetAcceptedReference,
} from "@/api/bet/placeBet";
import { rotateBetSlipIdempotencyKey } from "@/helpers/betIdempotency";
import { requestBetHistoryRefresh } from "@/state/sportsbookStoreHelpers";
import { showAcceptedBetInOpenBets } from "@/helpers/showAcceptedBetInOpenBets";
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
    const duplicateRef = placeBetAcceptedReference(call.result);
    if (duplicateRef) {
      requestBetHistoryRefresh();
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

  if (isPlaceBetAccepted(result)) {
    const betRef = placeBetAcceptedReference(result);
    if (!betRef) return "rejected";
    notify("Bet accepted", "success", "check2-circle", 2500);
    effects.refreshWallet();
    effects.subscribeCashout(betRef);
    await showAcceptedBetInOpenBets(betRef);
    effects.onAccepted(betRef);
    effects.clearSlip();
    rotateBetSlipIdempotencyKey();
    return "accepted";
  }

  if (isPlaceBetRejected(result)) {
    effects.onRejected(result.rejectionReason, result);
    rotateBetSlipIdempotencyKey();
    return "rejected";
  }

  return "rejected";
}
