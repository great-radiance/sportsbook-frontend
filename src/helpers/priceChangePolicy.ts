export type PriceChangePolicy =
  | "always-ask"
  | "accept-higher-odds"
  | "accept-any-odds";

/** Integration guide — `priceChange`: 0=None, 1=Any, 2=Higher */
export function priceChangePolicyToApiValue(
  policy: PriceChangePolicy,
): 0 | 1 | 2 {
  switch (policy) {
    case "accept-any-odds":
      return 1;
    case "accept-higher-odds":
      return 2;
    default:
      return 0;
  }
}

export function normalizePlaceBetRejectionReason(
  reason: string | undefined,
): string {
  if (!reason) return "REJECTED";
  if (reason === "PriceChanged") return "ODDS_CHANGED";
  return reason;
}
