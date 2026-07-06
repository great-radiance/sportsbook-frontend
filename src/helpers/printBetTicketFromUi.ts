import { fetchBetForPrint } from "@/helpers/fetchAcceptedBetForPrint";
import { loadOperatorBranding } from "@/helpers/loadOperatorBranding";
import { buildBetTicketPrintLabels } from "@/helpers/betTicketPrintLabels";
import { printBetTicket } from "@/helpers/printBetTicket";
import { sportsbookStore } from "@/state/sportsbookStoreContext";
import type { BetItemType } from "@/shared/utils/bet";
import { getSportsbookOperatorId } from "@/helpers/getSportsbookOperatorId";

/** Print a bet receipt from the My Bets UI (single, parlay, BB, or system group). */
export async function printBetTicketFromUi(
  bet: BetItemType,
  t: (key: string) => string,
): Promise<void> {
  if (!sportsbookStore.operatorBrandingLoaded.value) {
    await loadOperatorBranding();
  }

  const printableBet = await fetchBetForPrint(bet);

  await printBetTicket({
    bet: printableBet,
    showLogo: sportsbookStore.operatorPrintTicketWithLogo.value,
    logoUrl: sportsbookStore.operatorLogoUrl.value,
    paperWidthMm: sportsbookStore.operatorPrintTicketWidthMm.value,
    operatorId: getSportsbookOperatorId(),
    labels: buildBetTicketPrintLabels(t),
    translateStatus: t,
    translate: t,
  });
}
