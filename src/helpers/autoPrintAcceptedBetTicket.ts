import { getActiveI18n } from "@/core/sportsbookInit";
import { buildBetTicketPrintLabels } from "@/helpers/betTicketPrintLabels";
import { fetchAcceptedBetForPrint } from "@/helpers/fetchAcceptedBetForPrint";
import { loadOperatorBranding } from "@/helpers/loadOperatorBranding";
import { printBetTicket } from "@/helpers/printBetTicket";
import { sportsbookStore } from "@/state/sportsbookStoreContext";
import { getSportsbookOperatorId } from "@/helpers/getSportsbookOperatorId";

const {
  operatorBrandingLoaded,
  operatorPrintTicketWithLogo,
  operatorLogoUrl,
  operatorPrintTicketWidthMm,
} = sportsbookStore;

/** Print receipt after acceptance using fresh bet data from the API. */
export async function autoPrintAcceptedBetTicket(
  betRef: string,
): Promise<void> {
  if (!betRef.trim()) return;

  const bet = await fetchAcceptedBetForPrint(betRef);
  if (!bet) return;

  if (!operatorBrandingLoaded.value) {
    await loadOperatorBranding();
  }

  const i18n = getActiveI18n();
  if (!i18n) return;

  const t = (key: string) => i18n.t(`betslip.${key}`);

  await printBetTicket({
    bet,
    showLogo: operatorPrintTicketWithLogo.value,
    logoUrl: operatorLogoUrl.value,
    paperWidthMm: operatorPrintTicketWidthMm.value,
    operatorId: getSportsbookOperatorId(),
    labels: buildBetTicketPrintLabels(t),
    translateStatus: t,
    translate: t,
  });
}
