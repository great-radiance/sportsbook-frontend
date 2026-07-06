import { loadBetDetail } from "@/api/bet/apiBetDetail";
import { apiGetBetHistory } from "@/api/bet/betHistory";
import type { BetItemType } from "@/shared/utils/bet";
import { betTicketDetailScore } from "@/helpers/betTicketRender";

const RETRY_MS = 450;
const MAX_ATTEMPTS = 8;

const PRINTABLE_STATUSES = new Set(["accepted", "pending"]);

function matchesBetRef(bet: BetItemType, ref: string): boolean {
  return (
    bet.betId === ref ||
    bet.systemGroupId === ref ||
    bet._id === ref
  );
}

function isPrintReady(bet: BetItemType): boolean {
  if (!PRINTABLE_STATUSES.has(bet.status)) return false;
  if (bet.isSystemGroup) return (bet.subBets?.length ?? 0) > 0;
  return bet.legs.length > 0;
}

function pickBestPrintBet(
  candidates: Array<BetItemType | null | undefined>,
): BetItemType | null {
  let best: BetItemType | null = null;
  let bestScore = 0;

  for (const bet of candidates) {
    if (!bet || !isPrintReady(bet)) continue;
    const score = betTicketDetailScore(bet);
    if (score > bestScore) {
      best = bet;
      bestScore = score;
    }
  }

  return best;
}

function findBetInHistory(bets: BetItemType[], ref: string): BetItemType | undefined {
  return bets.find((bet) => matchesBetRef(bet, ref));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Load accepted bet from API with retries; legs built from stored `description`. */
export async function fetchAcceptedBetForPrint(
  betRef: string,
): Promise<BetItemType | null> {
  if (!betRef.trim()) return null;

  let lastCandidate: BetItemType | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const history = await apiGetBetHistory({
      tab: "open",
      page: 1,
      limit: 30,
    });
    const fromHistory = history?.bets
      ? findBetInHistory(history.bets, betRef)
      : undefined;
    const fromDetail = await loadBetDetail(betRef);
    const best = pickBestPrintBet([fromHistory, fromDetail]);

    if (best) {
      lastCandidate = best;
      if (betTicketDetailScore(best) >= 4) {
        return best;
      }
    }

    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(RETRY_MS);
    }
  }

  return lastCandidate;
}

/** Refresh bet payload before printing (BB/system legs from `description`). */
export async function fetchBetForPrint(
  bet: BetItemType,
): Promise<BetItemType> {
  const ref = bet.isSystemGroup
    ? bet.systemGroupId ?? bet.betId
    : bet.betId;
  const detailed = await loadBetDetail(ref);
  if (!detailed) return bet;
  return pickBestPrintBet([detailed, bet]) ?? bet;
}
