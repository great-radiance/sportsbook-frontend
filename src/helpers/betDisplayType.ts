import type { BetItemType } from "@/shared/utils/bet";

export function isBetBuilderBet(bet: BetItemType): boolean {
  if (bet.metadata?.isBetBuilder === true) return true;
  return bet.legs.some(
    (leg) =>
      Boolean(leg.isBetBuilder) ||
      (leg.betBuilderBetItems?.length ?? 0) > 0,
  );
}

/** i18n key for open-bets header — single BB bets show as bet builder. */
export function betTypeDisplayKey(bet: BetItemType): string {
  if (isBetBuilderBet(bet) && bet.betType === "single") return "betBuilder";
  return bet.betType;
}

export function betBuilderSelectionCount(bet: BetItemType): number {
  const fromItems = bet.legs.reduce(
    (sum, leg) => sum + (leg.betBuilderBetItems?.length ?? 0),
    0,
  );
  if (fromItems > 0) return fromItems;

  const fromMeta = bet.metadata?.selectionCount;
  if (typeof fromMeta === "number" && fromMeta > 0) return fromMeta;

  return bet.legs.length || 1;
}
