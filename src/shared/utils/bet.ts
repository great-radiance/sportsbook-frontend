import { tParticipant } from "@/types/tEvent";
import { Competition, Participant, Region, Sport } from "./types";

export type SelectedOddType = {
  sport: string;
  region: string;
  league: string;
  oddsId: string;
  name: string;
  marketId: string;
  eventId: number;
  sportSlug: string;
  // market: Market;
  marketName: string;
  participants: tParticipant[];
  startDate: number;
  isBuilding: boolean;
  selectedBank: boolean;
  amount: number;
};

export type betType = "single" | "multi" | "system" | "betbuilder";

export type betSelectionType = {
  sport: string;
  region: string;
  league: string;
  eventId: number;
  marketId: string;
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
};

export type ProviderResponseType = {
  transactionId: string;
  code: number;
  message: string;
};

export type BetItemType = {
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
};
