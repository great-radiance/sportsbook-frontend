import {
  betBuilderSelectionCount,
  betTypeDisplayKey,
  isBetBuilderBet,
} from "@/helpers/betDisplayType";
import { getBetStatusLabel } from "@/helpers/betStatus";
import {
  formatSystemTypeLabel,
  getSystemSizeLabel,
} from "@/helpers/systemBet";
import type { BetItemType, BetLegType, SystemCombinationDisplay } from "@/shared/utils/bet";
import {
  formatCurrency,
  formatDate,
  formatTime,
} from "@/shared/utils/formatters";
import type { BetTicketPrintLabels } from "@/helpers/printBetTicket";

export function isOpenBetStatus(status: string): boolean {
  return status === "accepted" || status === "pending";
}

export function legEventTitle(leg: BetLegType): string {
  if (leg.eventName) return leg.eventName;
  const home =
    leg.participants[0]?.name || leg.participants[0]?.providerName || "";
  const away =
    leg.participants[1]?.name || leg.participants[1]?.providerName || "";
  if (home && away) return `${home} - ${away}`;
  return home || away || "—";
}

export function legSelectionLabel(leg: BetLegType): string {
  if (leg.selectionDisplayName) return leg.selectionDisplayName;
  const selected = leg.odds.find((o) => o.selected) ?? leg.odds[0];
  return selected?.name || "—";
}

export function isBetBuilderLeg(leg: BetLegType): boolean {
  return Boolean(leg.isBetBuilder || (leg.betBuilderBetItems?.length ?? 0) > 0);
}

export function betTicketLegCount(bet: BetItemType): number {
  if (bet.isSystemGroup) {
    const totalSelections = bet.metadata?.totalSelections;
    if (typeof totalSelections === "number" && totalSelections > 0) {
      return totalSelections;
    }
    const fromSubBets = bet.subBets?.reduce(
      (sum, sub) => sum + (sub.legs.length || 1),
      0,
    );
    if (fromSubBets && fromSubBets > 0) return fromSubBets;
    return bet.subBets?.length ?? 0;
  }
  if (isBetBuilderBet(bet)) return betBuilderSelectionCount(bet);
  const fromMeta = bet.metadata?.selectionCount;
  if (typeof fromMeta === "number" && fromMeta > 0) return fromMeta;
  return bet.legs.length || 1;
}

export function betTicketCombinationCount(bet: BetItemType): number {
  if (typeof bet.metadata?.combinationCount === "number") {
    return bet.metadata.combinationCount;
  }
  return bet.subBets?.length ?? 0;
}

export function betTicketPayoutAmount(bet: BetItemType): number {
  if (bet.isSystemGroup) {
    if (typeof bet.metadata?.potentialPayout === "number") {
      return bet.metadata.potentialPayout;
    }
    if (typeof bet.metadata?.actualPayout === "number") {
      return bet.metadata.actualPayout;
    }
    if (bet.subBets?.length) {
      return bet.subBets.reduce(
        (sum, subBet) => sum + betTicketPayoutAmount(subBet),
        0,
      );
    }
    return 0;
  }
  if (bet.status === "cashed_out" && bet.cashoutAmount !== null) {
    return bet.cashoutAmount;
  }
  if (typeof bet.metadata?.actualPayout === "number") {
    return bet.metadata.actualPayout;
  }
  if (typeof bet.metadata?.potentialPayout === "number") {
    return bet.metadata.potentialPayout;
  }
  return bet.stakeAmount * bet.startingOdds;
}

export function betTicketTypeLabel(
  bet: BetItemType,
  labels: BetTicketPrintLabels,
): string {
  if (bet.isSystemGroup) {
    const systemLabel = formatSystemTypeLabel(bet.systemType ?? "");
    const totalSelections = bet.metadata?.totalSelections ?? 0;
    const base = `${labels.betTypeSystem} (${systemLabel})`;
    return totalSelections > 0 ? `${base} · ${totalSelections}` : base;
  }

  const key = betTypeDisplayKey(bet);
  if (key === "betBuilder") return labels.betTypeBetBuilder;
  if (key === "multi") return labels.betTypeMulti;
  if (key === "system") return labels.betTypeSystem;
  return labels.betTypeSingle;
}

export function subBetTypeLabel(
  subBet: BetItemType,
  labels: BetTicketPrintLabels,
): string {
  if (isBetBuilderBet(subBet)) return labels.betTypeBetBuilder;
  if (subBet.legs.length <= 1) return labels.betTypeSingle;
  return labels.betTypeMulti;
}

export function systemCombinationsForBet(
  bet: BetItemType,
): SystemCombinationDisplay[] {
  const raw = bet.metadata?.systemCombinations;
  return Array.isArray(raw) ? (raw as SystemCombinationDisplay[]) : [];
}

/** Score richness of leg data for choosing the best print payload. */
export function betTicketDetailScore(bet: BetItemType): number {
  if (bet.isSystemGroup && bet.subBets?.length) {
    return bet.subBets.reduce((sum, sub) => sum + betTicketDetailScore(sub), 0);
  }

  let score = bet.legs.reduce((sum, leg) => {
    let legScore = 0;
    if (leg.eventName?.trim()) legScore += 3;
    if (
      leg.selectionDisplayName?.trim() &&
      leg.selectionDisplayName !== "—"
    ) {
      legScore += 2;
    }
    if (leg.league?.name?.trim()) legScore += 1;
    if (leg.market?.name?.trim()) legScore += 1;
    if (Number(leg.odds[0]?.value) > 0) legScore += 1;
    if (isBetBuilderLeg(leg)) {
      legScore += (leg.betBuilderBetItems?.length ?? 0) * 2;
    }
    return sum + legScore;
  }, 0);

  if (isBetBuilderBet(bet)) {
    score += betBuilderSelectionCount(bet);
  }

  return score;
}

export type BetTicketRenderContext = {
  bet: BetItemType;
  labels: BetTicketPrintLabels;
  translate: (key: string) => string;
  fmt: (amount: number) => string;
  escapeHtml: (value: string) => string;
};

function legOddsValue(leg: BetLegType): number {
  return Number(
    leg.odds.find((o) => o.selected)?.value ?? leg.odds[0]?.value ?? 0,
  );
}

export function buildBetTicketLegHtml(
  leg: BetLegType,
  index: number,
  ctx: BetTicketRenderContext,
): string {
  const { labels, escapeHtml } = ctx;
  const league = leg.league?.name?.trim();
  const kickoff = leg.eventStartTime
    ? `${formatDate(leg.eventStartTime)} ${formatTime(new Date(leg.eventStartTime).getTime())}`
    : "";
  const head = `${escapeHtml(labels.leg)} ${index + 1}${league ? ` · ${escapeHtml(league)}` : ""}`;
  const event = escapeHtml(legEventTitle(leg));
  const kickoffHtml = kickoff
    ? `<div class="leg-meta">${escapeHtml(kickoff)}</div>`
    : "";

  if (isBetBuilderLeg(leg)) {
    const items = leg.betBuilderBetItems ?? [];
    const builderLines = items
      .map((item) => {
        const line =
          item.marketName && item.selectionName
            ? `${item.marketName} · ${item.selectionName}`
            : item.selectionName || item.marketName || "—";
        return `<li>${escapeHtml(line)}</li>`;
      })
      .join("");

    return `
      <div class="leg leg--builder">
        <div class="leg-head">${head}</div>
        <div class="leg-event">${event}</div>
        ${kickoffHtml}
        <div class="leg-builder-tag">${escapeHtml(labels.betTypeBetBuilder)}</div>
        ${builderLines ? `<ul class="builder-list">${builderLines}</ul>` : ""}
        <div class="leg-odds">${escapeHtml(labels.odds)}: ${legOddsValue(leg).toFixed(2)}</div>
      </div>
    `;
  }

  const marketHtml = leg.market?.name?.trim()
    ? `<div class="leg-meta">${escapeHtml(leg.market.name.trim())}</div>`
    : "";

  return `
    <div class="leg">
      <div class="leg-head">${head}</div>
      <div class="leg-event">${event}</div>
      ${kickoffHtml}
      ${marketHtml}
      <div class="leg-pick">${escapeHtml(legSelectionLabel(leg))}</div>
      <div class="leg-odds">${escapeHtml(labels.odds)}: ${legOddsValue(leg).toFixed(2)}</div>
    </div>
  `;
}

export function buildBetTicketLegsHtml(ctx: BetTicketRenderContext): string {
  return ctx.bet.legs
    .map((leg, index) => buildBetTicketLegHtml(leg, index, ctx))
    .join("");
}

export function buildBetTicketSystemCombinationsHtml(
  ctx: BetTicketRenderContext,
): string {
  const combos = systemCombinationsForBet(ctx.bet);
  if (!combos.length) return "";

  return combos
    .map(
      (combo) => `
        <div class="row row--compact">
          <span class="label">${ctx.escapeHtml(getSystemSizeLabel(combo.size, combo.count, ctx.translate))}</span>
          <span class="value">${ctx.fmt(combo.stake)}</span>
        </div>
      `,
    )
    .join("");
}

export function buildBetTicketSystemSubBetsHtml(
  ctx: BetTicketRenderContext,
): string {
  return (ctx.bet.subBets ?? [])
    .map((subBet, index) => {
      const subCtx: BetTicketRenderContext = { ...ctx, bet: subBet };
      const subLegs = buildBetTicketLegsHtml(subCtx);
      const comboLabel = `${ctx.labels.combination} ${index + 1} — ${ctx.escapeHtml(subBetTypeLabel(subBet, ctx.labels))}`;

      return `
        <div class="sub-bet">
          <div class="sub-bet-head">${comboLabel}</div>
          ${subLegs}
          <div class="row"><span class="label">${ctx.escapeHtml(ctx.labels.odds)}</span><span class="value">${Number(subBet.startingOdds).toFixed(2)}</span></div>
          <div class="row"><span class="label">${ctx.escapeHtml(ctx.labels.stake)}</span><span class="value">${ctx.fmt(subBet.stakeAmount)}</span></div>
        </div>
      `;
    })
    .join("");
}

export function buildBetTicketBodyHtml(ctx: BetTicketRenderContext): {
  legCount: number;
  combinationCount: number;
  statusLabel: string;
  placedAt: string;
  payoutLabel: string;
  betTypeSummary: string;
  oddsOrCombinationsRow: string;
  systemCombinationsHtml: string;
  legsHtml: string;
} {
  const { bet, labels, translate, fmt, escapeHtml } = ctx;
  const legCount = betTicketLegCount(bet);
  const combinationCount = betTicketCombinationCount(bet);
  const statusLabel = escapeHtml(getBetStatusLabel(bet.status, translate));
  const placedAt = escapeHtml(
    `${formatDate(bet.placedAt)}, ${formatTime(new Date(bet.placedAt).getTime())}`,
  );
  const payoutLabel = isOpenBetStatus(bet.status)
    ? labels.possibleWin
    : labels.result;
  const betTypeSummary = escapeHtml(betTicketTypeLabel(bet, labels));
  const legCountSuffix = legCount > 1 && !bet.isSystemGroup ? ` (${legCount})` : "";

  const oddsOrCombinationsRow =
    bet.isSystemGroup && combinationCount > 0
      ? `<div class="row"><span class="label">${escapeHtml(labels.systemCombinations)}</span><span class="value">${combinationCount}</span></div>`
      : `<div class="row"><span class="label">${escapeHtml(labels.odds)}</span><span class="value">${Number(bet.startingOdds).toFixed(2)}</span></div>`;

  const systemCombinationsHtml = bet.isSystemGroup
    ? buildBetTicketSystemCombinationsHtml(ctx)
    : "";

  const legsHtml =
    bet.isSystemGroup && bet.subBets?.length
      ? buildBetTicketSystemSubBetsHtml(ctx)
      : buildBetTicketLegsHtml(ctx);

  return {
    legCount,
    combinationCount,
    statusLabel,
    placedAt,
    payoutLabel,
    betTypeSummary: `${betTypeSummary}${legCountSuffix}`,
    oddsOrCombinationsRow,
    systemCombinationsHtml,
    legsHtml,
  };
}

export function formatBetTicketAmount(
  amount: number,
  currencyCode?: string,
): string {
  return formatCurrency(amount, currencyCode);
}
