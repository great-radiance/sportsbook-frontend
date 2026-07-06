import { apiGetOperatorBranding } from "@/api/operator/apiOperatorBranding";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

const {
  operatorPrintTicketWithLogo,
  operatorLogoUrl,
  operatorPrintTicketWidthMm,
  operatorBrandingLoaded,
} = sportsbookStore;

export async function loadOperatorBranding(): Promise<void> {
  try {
    const branding = await apiGetOperatorBranding();
    operatorPrintTicketWithLogo.value = branding.printTicketWithLogo;
    operatorLogoUrl.value = branding.logoUrl;
    operatorPrintTicketWidthMm.value = branding.printTicketWidthMm;
  } catch {
    operatorPrintTicketWithLogo.value = false;
    operatorLogoUrl.value = null;
    operatorPrintTicketWidthMm.value = 80;
  } finally {
    operatorBrandingLoaded.value = true;
  }
}

export function resetOperatorBranding(): void {
  operatorPrintTicketWithLogo.value = false;
  operatorLogoUrl.value = null;
  operatorPrintTicketWidthMm.value = 80;
  operatorBrandingLoaded.value = false;
}
