/** Event is open for betting (integration guide / widget slip checks). */
export function isEventBettable(eventTradingStatus: number | undefined): boolean {
  return eventTradingStatus === 0;
}

/** Market is fully closed — hide the market row. */
export function isMarketClosed(tradingStatus: number | undefined): boolean {
  return tradingStatus === 2 || tradingStatus === 3;
}

/** Market is suspended — selections render as locked. */
export function isMarketSuspended(tradingStatus: number | undefined): boolean {
  return tradingStatus === 1;
}

/** Market is open for betting. */
export function isMarketOpen(tradingStatus: number | undefined): boolean {
  return tradingStatus === 0;
}

export function isSelectionClosed(status: number | undefined): boolean {
  return status === 2 || status === 3;
}

export function isSelectionSuspended(
  status: number | undefined,
  marketTradingStatus: number | undefined,
): boolean {
  return status === 1 || isMarketSuspended(marketTradingStatus);
}

/** Selection can be added to the betslip right now. */
export function isSelectionBettable(
  selectionStatus: number | undefined,
  marketTradingStatus: number | undefined,
  eventTradingStatus?: number | undefined,
): boolean {
  if (eventTradingStatus != null && !isEventBettable(eventTradingStatus)) {
    return false;
  }
  if (!isMarketOpen(marketTradingStatus)) return false;
  return selectionStatus === 0;
}

export type SelectionAvailabilityMessage =
  | "event_unavailable"
  | "market_suspended"
  | "market_unavailable"
  | "selection_suspended"
  | "selection_unavailable";

export function selectionAvailabilityMessage(
  selectionStatus: number | undefined,
  marketTradingStatus: number | undefined,
  eventTradingStatus?: number | undefined,
): SelectionAvailabilityMessage | null {
  if (eventTradingStatus != null && !isEventBettable(eventTradingStatus)) {
    return "event_unavailable";
  }
  if (isMarketSuspended(marketTradingStatus)) return "market_suspended";
  if (isMarketClosed(marketTradingStatus)) return "market_unavailable";
  if (selectionStatus === 1) return "selection_suspended";
  if (isSelectionClosed(selectionStatus)) return "selection_unavailable";
  return null;
}

export function selectionAvailabilityNotifyMessage(
  reason: SelectionAvailabilityMessage,
  marketName?: string,
  selectionName?: string,
): string {
  switch (reason) {
    case "event_unavailable":
      return "Event is no longer available";
    case "market_suspended":
      return marketName
        ? `This market is suspended: ${marketName}`
        : "This market is suspended";
    case "market_unavailable":
      return marketName
        ? `This market is no longer available: ${marketName}`
        : "This market is no longer available";
    case "selection_suspended":
      return marketName && selectionName
        ? `This selection is suspended: ${marketName} — ${selectionName}`
        : "This selection is suspended";
    case "selection_unavailable":
      return marketName && selectionName
        ? `This selection is no longer available: ${marketName} — ${selectionName}`
        : "This selection is no longer available";
  }
}
