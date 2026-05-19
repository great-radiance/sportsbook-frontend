/** Open bets that can show the cashout action (integration guide). */
export function isCashoutableStatus(status: string): boolean {
  return status === "accepted" || status === "partially_cashed_out";
}

/** Label for API bet status — no remapping (e.g. accepted stays accepted). */
export function getBetStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  const key = status.toLowerCase();
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Max cashout amount: up to 90% of stake; cap by API offer when lower. */
export function getMaxCashoutAmount(
  stakeAmount: number,
  apiCashoutAmount?: number | null,
): number {
  const stakeCap = Math.max(0, Number(stakeAmount) || 0) * 0.9;
  if (apiCashoutAmount != null && apiCashoutAmount > 0) {
    return Math.min(apiCashoutAmount, stakeCap);
  }
  return stakeCap;
}
