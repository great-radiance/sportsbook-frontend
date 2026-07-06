import type { BetItemType } from "@/shared/utils/bet";
import { formatCurrency } from "@/shared/utils/formatters";
import {
  betTicketPayoutAmount,
  buildBetTicketBodyHtml,
  type BetTicketRenderContext,
} from "@/helpers/betTicketRender";
import {
  betTicketQrSizePx,
  buildBetTicketQrPayload,
  buildBetTicketVerifyUrl,
  createBetTicketQrDataUrl,
} from "@/helpers/betTicketQr";

const DEFAULT_SITE_LOGO = "/logo.png";
export const DEFAULT_PRINT_TICKET_WIDTH_MM = 80;
const MIN_PRINT_TICKET_WIDTH_MM = 40;
const MAX_PRINT_TICKET_WIDTH_MM = 120;

export function normalizePrintTicketWidthMm(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PRINT_TICKET_WIDTH_MM;
  const rounded = Math.round(n);
  return Math.min(
    MAX_PRINT_TICKET_WIDTH_MM,
    Math.max(MIN_PRINT_TICKET_WIDTH_MM, rounded),
  );
}

export type BetTicketPrintLabels = {
  betType: string;
  betTypeSingle: string;
  betTypeMulti: string;
  betTypeSystem: string;
  betTypeBetBuilder: string;
  stake: string;
  odds: string;
  result: string;
  possibleWin: string;
  betId: string;
  placedAt: string;
  leg: string;
  receiptTitle: string;
  systemCombinations: string;
  combination: string;
};

export type BetTicketPrintOptions = {
  bet: BetItemType;
  showLogo: boolean;
  logoUrl: string | null;
  paperWidthMm?: number;
  operatorId?: string | null;
  labels: BetTicketPrintLabels;
  translateStatus: (status: string) => string;
  /** Full betslip i18n lookup (system size labels, etc.). */
  translate?: (key: string) => string;
};

function resolveLogoUrl(logoUrl: string | null): string {
  const raw = logoUrl?.trim() || DEFAULT_SITE_LOGO;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }
  return raw;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildReceiptHtml({
  bet,
  showLogo,
  logoUrl,
  paperWidthMm,
  operatorId,
  qrDataUrl,
  verifyUrl,
  labels,
  translateStatus,
  translate,
}: BetTicketPrintOptions & {
  qrDataUrl?: string | null;
  verifyUrl?: string;
}): string {
  const widthMm = normalizePrintTicketWidthMm(paperWidthMm);
  const qrSizeMm = Math.min(Math.max(widthMm * 0.34, 18), 32);
  const currencyCode =
    typeof bet.metadata?.currency === "string"
      ? bet.metadata.currency
      : undefined;
  const fmt = (amount: number) => escapeHtml(formatCurrency(amount, currencyCode));
  const renderCtx: BetTicketRenderContext = {
    bet,
    labels,
    translate: translate ?? translateStatus,
    fmt,
    escapeHtml,
  };
  const body = buildBetTicketBodyHtml(renderCtx);

  const logoBlock =
    showLogo
      ? `<div class="logo-wrap"><img src="${escapeHtml(resolveLogoUrl(logoUrl))}" alt="" class="logo" /></div>`
      : "";

  const qrBlock =
    qrDataUrl
      ? `<div class="qr-wrap"><img src="${qrDataUrl}" alt="" class="qr" /><div class="qr-url">${escapeHtml(verifyUrl ?? buildBetTicketVerifyUrl(bet.betId, operatorId))}</div></div>`
      : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(labels.receiptTitle)}</title>
    <style>
      * { box-sizing: border-box; }
      @page {
        size: ${widthMm}mm auto;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: ${widthMm}mm;
        font: 12px/1.4 Arial, Helvetica, sans-serif;
        color: #111;
      }
      body {
        padding: 3mm;
      }
      .receipt {
        width: 100%;
        max-width: ${widthMm}mm;
        margin: 0 auto;
      }
      .logo-wrap {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        margin-bottom: 3mm;
      }
      .logo {
        display: block;
        margin: 0 auto;
        max-width: calc(${widthMm}mm - 6mm);
        max-height: 18mm;
        object-fit: contain;
      }
      .qr-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        margin-top: 4mm;
        padding-top: 2mm;
        border-top: 1px dashed #999;
      }
      .qr {
        display: block;
        margin: 0 auto;
        width: ${qrSizeMm}mm;
        height: ${qrSizeMm}mm;
        object-fit: contain;
      }
      .qr-url {
        margin-top: 6px;
        width: 100%;
        font-size: 8px;
        line-height: 1.35;
        word-break: break-all;
        text-align: center;
        color: #444;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 16px;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 4px 0;
      }
      .label { color: #444; }
      .value { font-weight: 600; text-align: right; }
      .status { text-transform: uppercase; }
      hr {
        border: 0;
        border-top: 1px dashed #999;
        margin: 10px 0;
      }
      .leg {
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 8px;
        margin-top: 8px;
      }
      .sub-bet {
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        margin-top: 10px;
      }
      .leg-head, .leg-meta { color: #666; font-size: 10px; }
      .leg-event, .leg-pick { margin-top: 4px; font-weight: 600; }
      .leg-odds { margin-top: 6px; }
      .leg-builder-tag {
        display: inline-block;
        margin-top: 6px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .sub-bet-head {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .row--compact { margin: 2px 0; font-size: 10px; }
      .builder-list {
        margin: 6px 0 0 16px;
        padding: 0;
        font-size: 11px;
      }
      @media print {
        html, body {
          width: ${widthMm}mm;
          padding: 2mm;
        }
      }
    </style>
  </head>
  <body>
    <div class="receipt">
      ${logoBlock}
      <h1>${escapeHtml(labels.receiptTitle)}</h1>
      <div class="row"><span class="label">${escapeHtml(labels.betId)}</span><span class="value">${escapeHtml(bet.betId)}</span></div>
      <div class="row"><span class="label">${escapeHtml(labels.placedAt)}</span><span class="value">${body.placedAt}</span></div>
      <div class="row"><span class="label">${escapeHtml(labels.betType)}</span><span class="value">${body.betTypeSummary}</span></div>
      <div class="row"><span class="label status">${body.statusLabel}</span><span class="value"></span></div>
      <hr />
      <div class="row"><span class="label">${escapeHtml(labels.stake)}</span><span class="value">${fmt(bet.stakeAmount)}</span></div>
      ${body.oddsOrCombinationsRow}
      ${body.systemCombinationsHtml}
      <div class="row"><span class="label">${escapeHtml(body.payoutLabel)}</span><span class="value">${fmt(betTicketPayoutAmount(bet))}</span></div>
      ${body.legsHtml ? `<hr />${body.legsHtml}` : ""}
      ${qrBlock}
    </div>
  </body>
</html>`;
}

export async function printBetTicket(options: BetTicketPrintOptions): Promise<void> {
  const widthMm = normalizePrintTicketWidthMm(options.paperWidthMm);
  const verifyUrl = buildBetTicketVerifyUrl(options.bet.betId, options.operatorId);
  let qrDataUrl: string | null = null;

  try {
    qrDataUrl = await createBetTicketQrDataUrl(
      buildBetTicketQrPayload(options.bet, options.operatorId),
      betTicketQrSizePx(widthMm),
    );
  } catch {
    qrDataUrl = null;
  }

  const html = buildReceiptHtml({ ...options, qrDataUrl, verifyUrl });
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(cleanup, 1000);
    }
  };

  const pendingImages = Array.from(
    doc.querySelectorAll<HTMLImageElement>(".logo, .qr"),
  ).filter((img) => !img.complete);

  if (pendingImages.length > 0) {
    let loaded = 0;
    const onDone = () => {
      loaded += 1;
      if (loaded >= pendingImages.length) triggerPrint();
    };
    for (const img of pendingImages) {
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
    }
    window.setTimeout(triggerPrint, 1500);
    return;
  }

  triggerPrint();
}
