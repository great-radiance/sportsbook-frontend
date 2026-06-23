import type { BetItemType } from "@/shared/utils/bet";

const TERMINAL_STATUSES = new Set([
  "won",
  "lost",
  "voided",
  "cashed_out",
  "cancelled",
]);

export type CashoutUpdateEvent = {
  betId: string;
  systemGroupId?: string | null;
  cashoutAvailable: boolean;
  amount?: number;
};

export type BetUpdateEvent = {
  betId: string;
  systemGroupId?: string | null;
  status: string;
  actualPayout?: number | null;
  cashoutAmount?: number | null;
  settledAt?: string | null;
  cashoutAt?: string | null;
};

function patchBet(
  bet: BetItemType,
  patch: Partial<BetItemType>,
): BetItemType {
  return {
    ...bet,
    ...patch,
    metadata: { ...bet.metadata, ...patch.metadata },
  };
}

export function applyBetHistoryCashoutUpdate(
  bets: BetItemType[],
  update: CashoutUpdateEvent,
): BetItemType[] {
  if (update.systemGroupId) {
    return bets.map((group) => {
      if (!group.isSystemGroup || group.systemGroupId !== update.systemGroupId) {
        return group;
      }
      return {
        ...group,
        subBets: group.subBets?.map((sub) => {
          if (sub.betId !== update.betId) return sub;
          return patchBet(sub, {
            metadata: {
              apiCashoutAmount: update.cashoutAvailable
                ? (update.amount ?? null)
                : null,
              canCashout: update.cashoutAvailable,
            },
          });
        }),
      };
    });
  }

  return bets.map((bet) => {
    if (bet.betId !== update.betId) return bet;
    return patchBet(bet, {
      metadata: {
        apiCashoutAmount: update.cashoutAvailable
          ? (update.amount ?? null)
          : null,
        canCashout: update.cashoutAvailable,
      },
    });
  });
}

export function applyBetHistoryBetUpdate(
  bets: BetItemType[],
  update: BetUpdateEvent,
): BetItemType[] {
  if (update.systemGroupId) {
    return bets.map((group) => {
      if (!group.isSystemGroup || group.systemGroupId !== update.systemGroupId) {
        return group;
      }
      const subBets = group.subBets?.map((sub) => {
        if (sub.betId !== update.betId) return sub;
        return patchBet(sub, {
          status: update.status,
          cashoutAmount: update.cashoutAmount ?? sub.cashoutAmount,
          cashedOutAt: update.cashoutAt ?? sub.cashedOutAt,
          settledAt: update.settledAt ?? sub.settledAt,
          metadata: {
            actualPayout: update.actualPayout ?? sub.metadata?.actualPayout,
            apiCashoutAmount: null,
          },
        });
      });
      const allTerminal = subBets?.every((b) => TERMINAL_STATUSES.has(b.status));
      return {
        ...group,
        subBets,
        status: allTerminal ? "settled" : group.status,
      };
    });
  }

  return bets.map((bet) => {
    if (bet.betId !== update.betId) return bet;
    return patchBet(bet, {
      status: update.status,
      cashoutAmount: update.cashoutAmount ?? bet.cashoutAmount,
      cashedOutAt: update.cashoutAt ?? bet.cashedOutAt,
      settledAt: update.settledAt ?? bet.settledAt,
      metadata: {
        actualPayout: update.actualPayout ?? bet.metadata?.actualPayout,
        apiCashoutAmount: null,
      },
    });
  });
}
