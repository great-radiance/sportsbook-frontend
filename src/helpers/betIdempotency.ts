import { betSlipIdempotencyKey } from "@/state/betState";

/** Integration guide § Step 4 — new key when slip or stake changes. */
export function rotateBetSlipIdempotencyKey(): string {
  const key = crypto.randomUUID();
  betSlipIdempotencyKey.value = key;
  return key;
}

export function currentBetSlipIdempotencyKey(): string {
  if (!betSlipIdempotencyKey.value) {
    return rotateBetSlipIdempotencyKey();
  }
  return betSlipIdempotencyKey.value;
}
