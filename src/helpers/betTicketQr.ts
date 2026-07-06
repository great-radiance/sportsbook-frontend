import QRCode from "qrcode";
import type { BetItemType } from "@/shared/utils/bet";

const BET_TICKET_VERIFY_PATH = "/bet-ticket";

/** Full site URL for scanning a printed bet ticket. */
export function buildBetTicketVerifyUrl(
  betId: string,
  operatorId?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("id", betId.trim());
  const operator = operatorId?.trim();
  if (operator) params.set("operator", operator);

  const query = params.toString();
  const path = `${BET_TICKET_VERIFY_PATH}?${query}`;

  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }

  const siteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, "");
  if (siteUrl) return `${siteUrl}${path}`;

  return path;
}

/** Payload scanned from a printed bet ticket (full verify URL). */
export function buildBetTicketQrPayload(
  bet: BetItemType,
  operatorId?: string | null,
): string {
  return buildBetTicketVerifyUrl(bet.betId, operatorId);
}

export async function createBetTicketQrDataUrl(
  payload: string,
  sizePx: number,
): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: sizePx,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

export function betTicketQrSizePx(paperWidthMm: number): number {
  const clamped = Math.min(120, Math.max(40, paperWidthMm));
  return Math.round(Math.min(Math.max(clamped * 3.2, 120), 200));
}
