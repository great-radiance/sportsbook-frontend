import type { BetTicketPrintLabels } from "@/helpers/printBetTicket";

/** Shared receipt labels for manual and auto print flows. */
export function buildBetTicketPrintLabels(
  t: (key: string) => string,
): BetTicketPrintLabels {
  return {
    betType: t("printBetType"),
    betTypeSingle: t("single"),
    betTypeMulti: t("multiple"),
    betTypeSystem: t("system"),
    betTypeBetBuilder: t("betBuilder"),
    stake: t("stakePlaceholder"),
    odds: t("oddsDecimal"),
    result: t("result"),
    possibleWin: t("possibleWin"),
    betId: t("printBetId"),
    placedAt: t("printPlacedAt"),
    leg: t("leg"),
    receiptTitle: t("printReceiptTitle"),
    systemCombinations: t("systemCombinations"),
    combination: t("printCombination"),
  };
}
