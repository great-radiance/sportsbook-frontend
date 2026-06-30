import {
  apiBetBuilderPrice,
  isBetBuilderCombinable,
} from "@/api/bet/apiBetBuilderPrice";
import { hasPlayerSessionUserId } from "@/api/instance";
import type { StarPlayerCardResponse, WidgetPickResponse } from "./homeWidgetTypes";
import {
  bundleOdds,
  parseEvent,
  slipToPicks,
  type ApiEventInfo,
  type ApiSlipLeg,
} from "./homeWidgetNormalize";

type ApiMarketSelection = NonNullable<
  NonNullable<ApiSlipLeg["market"]>["selections"]
>[number];

const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;

/** Parse competitor id from API fields (`21376`, `"21376"`, or numeric). */
export function parseCompetitorId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function selectionCompetitorId(
  selection: ApiSlipLeg["selection"] | ApiMarketSelection | undefined,
): number | null {
  if (!selection) return null;
  const direct = parseCompetitorId(selection.competitorId);
  if (direct) return direct;
  return parseCompetitorId(selection.extraParameters?.competitorId);
}

function marketTeamCompetitorId(market: ApiSlipLeg["market"]): number | null {
  return parseCompetitorId(market?.extraParameters?.competitorId);
}

function isMatchWinnerLeg(leg: ApiSlipLeg): boolean {
  if (leg.market?.type === 1) return true;
  const name = str(leg.market?.name).toLowerCase();
  return name === "1x2" || name === "match result" || name === "match winner";
}

function isPlayerPropLeg(leg: ApiSlipLeg): boolean {
  if (isMatchWinnerLeg(leg)) return false;

  const playerId = leg.selection?.extraParameters?.playerId;
  if (playerId != null && String(playerId).trim() !== "") return true;

  const teamCompetitorId = marketTeamCompetitorId(leg.market);
  if (!teamCompetitorId) return false;

  const betBuilderId = str(leg.selection?.extraParameters?.betBuilderId);
  if (betBuilderId.includes("PPSLT") || betBuilderId.includes("PLAYER")) {
    return true;
  }

  const marketName = str(leg.market?.name).toLowerCase();
  return (
    marketName.includes("goalscorer") ||
    marketName.includes("scorer") ||
    marketName.includes("player")
  );
}

function findPlayerLegIndex(slip: ApiSlipLeg[]): number {
  for (let i = slip.length - 1; i >= 0; i -= 1) {
    if (isPlayerPropLeg(slip[i])) return i;
  }
  return -1;
}

function isTotalLeg(leg: ApiSlipLeg): boolean {
  if (isMatchWinnerLeg(leg) || isPlayerPropLeg(leg)) return false;
  if (leg.market?.type === 66) return true;
  const name = str(leg.market?.name).toLowerCase();
  return name.includes("total");
}

function findTotalLegIndex(slip: ApiSlipLeg[]): number {
  return slip.findIndex((leg) => isTotalLeg(leg));
}

const TARGET_STAR_PLAYER_CARD_COUNT = 5;

function isActiveSelection(selection: ApiMarketSelection): boolean {
  return (
    selection.status === 0 &&
    typeof selection.price === "number" &&
    selection.price > 0 &&
    str(selection.name).trim() !== ""
  );
}

/** Lowest decimal odds first (favorites). */
function lowOddsSelections(
  selections: ApiMarketSelection[] | undefined,
): ApiMarketSelection[] {
  return (selections ?? [])
    .filter(isActiveSelection)
    .sort((a, b) => a.price - b.price);
}

function variantKeyFromSlip(
  slip: ApiSlipLeg[],
  eventId: number,
): string | null {
  const playerIdx = findPlayerLegIndex(slip);
  const totalIdx = findTotalLegIndex(slip);
  if (playerIdx < 0 || totalIdx < 0) return null;

  const playerSelectionId = slip[playerIdx]?.selection?.id;
  const totalSelectionId = slip[totalIdx]?.selection?.id;
  if (!playerSelectionId || !totalSelectionId) return null;

  return `${eventId}:${playerSelectionId}:${totalSelectionId}`;
}

function cloneSlipWithSelections(
  slip: ApiSlipLeg[],
  playerIdx: number,
  playerSel: ApiMarketSelection,
  totalIdx: number,
  totalSel: ApiMarketSelection,
): ApiSlipLeg[] {
  return slip.map((leg, index) => {
    if (index === playerIdx) {
      return { ...leg, selection: { ...playerSel }, bbPrice: null };
    }
    if (index === totalIdx) {
      return { ...leg, selection: { ...totalSel }, bbPrice: null };
    }
    return { ...leg, bbPrice: null };
  });
}

/** Match-winner leg (1x2 / type 1). */
function findWinnerLegIndex(slip: ApiSlipLeg[]): number {
  const byType = slip.findIndex((leg) => isMatchWinnerLeg(leg));
  if (byType >= 0) return byType;
  return slip.length > 0 ? 0 : -1;
}

function findWinnerSelectionForTeam(
  leg: ApiSlipLeg,
  teamCompetitorId: number,
): ApiMarketSelection | undefined {
  return leg.market?.selections?.find(
    (candidate) => selectionCompetitorId(candidate) === teamCompetitorId,
  );
}

/**
 * Ensure the match-winner selection belongs to the same team as the player prop market.
 * Returns a new slip when the winner leg was swapped.
 */
export function reconcileStarPlayerWinnerLeg(slip: ApiSlipLeg[]): {
  slip: ApiSlipLeg[];
  winnerRealigned: boolean;
} {
  const playerIdx = findPlayerLegIndex(slip);
  const winnerIdx = findWinnerLegIndex(slip);
  if (playerIdx < 0 || winnerIdx < 0) {
    return { slip, winnerRealigned: false };
  }

  const playerLeg = slip[playerIdx];
  const teamCompetitorId = marketTeamCompetitorId(playerLeg.market);
  if (!teamCompetitorId) {
    return { slip, winnerRealigned: false };
  }

  const winnerLeg = slip[winnerIdx];
  const winnerCompetitorId = selectionCompetitorId(winnerLeg.selection);
  if (winnerCompetitorId === teamCompetitorId) {
    return { slip, winnerRealigned: false };
  }

  const replacement = findWinnerSelectionForTeam(winnerLeg, teamCompetitorId);
  if (!replacement?.id) {
    return { slip, winnerRealigned: false };
  }

  const next = slip.map((leg, index) =>
    index === winnerIdx
      ? {
          ...leg,
          selection: { ...replacement },
        }
      : leg,
  );

  return { slip: next, winnerRealigned: true };
}

export function starPlayerNameFromSlip(slip: ApiSlipLeg[]): string {
  const playerIdx = findPlayerLegIndex(slip);
  if (playerIdx < 0) return "";
  return str(slip[playerIdx]?.selection?.name).trim();
}

function bbPriceFromSlip(slip: ApiSlipLeg[]): number | null {
  for (let i = slip.length - 1; i >= 0; i -= 1) {
    const price = slip[i]?.bbPrice;
    if (typeof price === "number" && price > 0) return price;
  }
  return null;
}

async function fetchBetBuilderPrice(
  eventId: number,
  picks: WidgetPickResponse[],
): Promise<number | null> {
  if (picks.length < 2 || !hasPlayerSessionUserId()) return null;

  try {
    const result = await apiBetBuilderPrice({
      eventId,
      bets: picks.map((pick) => ({
        marketId: pick.marketId,
        selectionId: pick.selectionId,
      })),
    });
    if (isBetBuilderCombinable(result) && typeof result.price === "number") {
      return result.price;
    }
  } catch {
    // Fall back to leg bbPrice / product below.
  }
  return null;
}

async function resolveStarPlayerBbPrice(
  eventId: number,
  slip: ApiSlipLeg[],
  picks: WidgetPickResponse[],
  winnerRealigned: boolean,
): Promise<number | null> {
  const cached = bbPriceFromSlip(slip);
  if (winnerRealigned || cached == null) {
    const fetched = await fetchBetBuilderPrice(eventId, picks);
    if (fetched != null) return fetched;
  }
  return cached;
}

export type ApiStarPlayerEntry = {
  selectionName: string;
  eventInfo: ApiEventInfo;
  slip: ApiSlipLeg[];
};

async function buildStarPlayerCard(
  slip: ApiSlipLeg[],
  event: ReturnType<typeof parseEvent>,
  cardId: string,
  options?: { forceBbPriceFetch?: boolean },
): Promise<StarPlayerCardResponse | null> {
  const { slip: reconciledSlip, winnerRealigned } =
    reconcileStarPlayerWinnerLeg(slip);
  const picks = slipToPicks(reconciledSlip, event);
  if (!picks.length) return null;

  const playerName = starPlayerNameFromSlip(reconciledSlip);
  if (!playerName) return null;

  const bbCombinedOdds = await resolveStarPlayerBbPrice(
    event.eventId,
    reconciledSlip,
    picks,
    winnerRealigned || Boolean(options?.forceBbPriceFetch),
  );

  return {
    cardId,
    playerName,
    ...event,
    picks,
    bbCombinedOdds,
    combinedOdds: bundleOdds(picks, bbCombinedOdds),
  };
}

async function padStarPlayerCards(
  cards: StarPlayerCardResponse[],
  entries: ApiStarPlayerEntry[],
  usedKeys: Set<string>,
  startIndex: number,
): Promise<StarPlayerCardResponse[]> {
  if (cards.length >= TARGET_STAR_PLAYER_CARD_COUNT) {
    return cards.slice(0, TARGET_STAR_PLAYER_CARD_COUNT);
  }

  const result = [...cards];
  let cardIndex = startIndex;

  for (const entry of entries) {
    if (result.length >= TARGET_STAR_PLAYER_CARD_COUNT) break;

    const event = parseEvent(entry.eventInfo);
    const playerIdx = findPlayerLegIndex(entry.slip);
    const totalIdx = findTotalLegIndex(entry.slip);
    if (playerIdx < 0 || totalIdx < 0) continue;

    const playerLeg = entry.slip[playerIdx];
    const totalLeg = entry.slip[totalIdx];
    const playerSelections = lowOddsSelections(playerLeg.market?.selections);
    const totalSelections = lowOddsSelections(totalLeg.market?.selections);

    for (const playerSel of playerSelections) {
      if (result.length >= TARGET_STAR_PLAYER_CARD_COUNT) break;

      for (const totalSel of totalSelections) {
        if (result.length >= TARGET_STAR_PLAYER_CARD_COUNT) break;

        const variantSlip = cloneSlipWithSelections(
          entry.slip,
          playerIdx,
          playerSel,
          totalIdx,
          totalSel,
        );
        const key = variantKeyFromSlip(variantSlip, event.eventId);
        if (!key || usedKeys.has(key)) continue;

        const card = await buildStarPlayerCard(
          variantSlip,
          event,
          `sp-${event.eventId}-${cardIndex}`,
          { forceBbPriceFetch: true },
        );
        if (!card) continue;

        usedKeys.add(key);
        result.push(card);
        cardIndex += 1;
      }
    }
  }

  return result;
}

export async function normalizeStarPlayers(
  groups: { sportId: number; players: ApiStarPlayerEntry[] }[] | undefined,
): Promise<StarPlayerCardResponse[]> {
  const entries: ApiStarPlayerEntry[] = [];
  for (const group of groups ?? []) {
    entries.push(...group.players);
  }

  const usedKeys = new Set<string>();
  const cards: StarPlayerCardResponse[] = [];
  let cardIndex = 0;

  for (const player of entries) {
    const event = parseEvent(player.eventInfo);
    const { slip } = reconcileStarPlayerWinnerLeg(player.slip);
    const key = variantKeyFromSlip(slip, event.eventId);
    if (key && usedKeys.has(key)) continue;

    const card = await buildStarPlayerCard(
      player.slip,
      event,
      `sp-${event.eventId}-${cardIndex}`,
    );
    if (!card) continue;

    if (key) usedKeys.add(key);
    cards.push(card);
    cardIndex += 1;
  }

  return padStarPlayerCards(cards, entries, usedKeys, cardIndex);
}
