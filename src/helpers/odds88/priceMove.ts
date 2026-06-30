/** Odds movement: 1 = price up, -1 = down, 0 = unchanged. */
export function computePriceMv(
  previousSelection: { price: number; mv: number },
  nextPrice: number,
): number {
  const eps = 0.0001;
  if (nextPrice > previousSelection.price + eps) return 1;
  if (nextPrice < previousSelection.price - eps) return -1;
  return previousSelection.mv;
}
