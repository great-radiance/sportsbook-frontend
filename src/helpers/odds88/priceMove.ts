/** Odds movement: 1 = price up, -1 = down, 0 = unchanged. */
export function computePriceMv(
  previousPrice: number,
  nextPrice: number,
): number {
  const eps = 0.0001;
  if (nextPrice > previousPrice + eps) return 1;
  if (nextPrice < previousPrice - eps) return -1;
  return previousPrice;
}
