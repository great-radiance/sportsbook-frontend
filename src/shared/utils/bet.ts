import { tParticipant } from "@/types/tEvent";
import { Competition, Participant, Region, Sport } from "./types";

/** Sport / region / league reference on betslip selections. */
export type BetContextRef = {
  id: number;
  name: string;
};

export type SelectedOddType = {
  sport: BetContextRef;
  region: BetContextRef;
  league: BetContextRef;
  oddsId: string;
  name: string;
  marketId: number;
  eventId: number;
  sportSlug: string;
  // market: Market;
  marketName: string;
  participants: tParticipant[];
  startDate: number;
  isBuilding: boolean;
  selectedBank: boolean;
  amount: number;
  /** Numeric market id for `POST /bets/place` (same as backend `marketId`). */
  apiMarketId: number;
  /** Numeric selection id for `POST /bets/place` (same as backend `selectionId`). */
  apiSelectionId: number;
};

export type betType = "single" | "multi" | "system";

export type betSelectionType = {
  sport: BetContextRef;
  region: BetContextRef;
  league: BetContextRef;
  eventId: number;
  marketId: number;
  oddsId: string;
  oddsValue: number;
};

export type betRequestType = {
  selections: betSelectionType[];
  currency: string;
  stakeAmount: number;
  betKind: betType;
  systemSpecifier?: string;
  acceptChangedOdds?: boolean;
};

export type BetBuilderBetItemDisplay = {
  marketId: number;
  selectionId: number;
  marketName?: string;
  selectionName?: string;
};

export type BetLegType = {
  eventId: number;
  sport: Sport;
  region: Region;
  league: Competition;
  participants: Participant[];
  market: any;
  odds: {
    id: string;
    name: string;
    value: number;
    selected: boolean;
    currentValue: number;
    settlement: any;
  }[];
  isBetBuilder?: boolean;
  betBuilderBetItems?: BetBuilderBetItemDisplay[];
  eventName?: string;
  selectionDisplayName?: string;
  selectionStatus?: string;
  settlementResult?: string | null;
  eventStartTime?: string;
  legPotentialPayout?: number;
};

export type ProviderResponseType = {
  transactionId: string;
  code: number;
  message: string;
};

export type SystemCombinationDisplay = {
  size: number;
  stake: number;
  count: number;
};

export type BetItemType = {
  _id?: string;
  betId: string;
  userId: string;
  startingOdds: number;
  betType: betType;
  legs: BetLegType[];
  details: BetLegType[];
  systemType: string;
  remainingStake: number;
  autoCashoutSettings: any | null;
  stakeAmount: number;
  status: string;
  cashoutHistory: any[];
  cashoutAmount: number | null;
  cashedOutAt: string | null;
  placedAt: string;
  settledAt: string | null;
  providerResponse: ProviderResponseType;
  metadata: Record<string, any>;
  /** True when this row is a system bet group (no top-level cashout). */
  isSystemGroup?: boolean;
  /** Group id for system bets — same as `betId` on the group row. */
  systemGroupId?: string;
  /** Individual combinations inside a system group (each has its own `betId` for cashout). */
  subBets?: BetItemType[];
};

function normalizeBetContextRef(value: unknown, fallbackId = 0): BetContextRef {
  if (value && typeof value === "object" && "name" in value) {
    const o = value as { id?: number; name?: string };
    return {
      id: Number(o.id) || fallbackId,
      name: String(o.name ?? ""),
    };
  }
  return { id: fallbackId, name: String(value ?? "") };
}

/** Restores selections persisted before sport/region/league became objects. */
export function normalizeSelectedOddRow(row: SelectedOddType): SelectedOddType {
  const sportSlugId = Number(row.sportSlug) || 0;
  return {
    ...row,
    sport: normalizeBetContextRef(row.sport, sportSlugId),
    region: normalizeBetContextRef(row.region),
    league: normalizeBetContextRef(row.league),
  };
}
