import {
  BetItemType,
  BetLegType,
  betType,
  ProviderResponseType,
} from "@/shared/utils/bet";
import type {
  Competition,
  Participant,
  Region,
  Sport,
} from "@/shared/utils/types";
import { instance } from "../instance";

/** One row from `GET /bets/history` (integration guide). */
export type BetHistoryApiRow = {
  betId: string;
  betType: string;
  stakeAmount: number;
  potentialPayout: number;
  actualPayout: number | null;
  status: string;
  currency: string;
  combinedOdds: number;
  createdAt: string;
  settledAt: string | null;
  selectionCount?: number;
  firstEventName?: string;
  sportName?: string;
  leagueName?: string;
  shortResult?: string;
};

export type BetHistoryApiResponse = {
  total: number;
  page: number;
  limit: number;
  data: BetHistoryApiRow[];
};

export interface BetHistoryQueryParams {
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
  /** Guide: `pending`, `accepted`, `won`, `lost`, `voided`, `cashed_out`, `cancelled` (comma-separated if your API supports it). */
  status?: string;
  betType?: string;
  from?: string;
  to?: string;
  sportId?: number;
  leagueId?: number;
}

export interface BetHistoryResponseDto {
  bets: BetItemType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const emptyProvider: ProviderResponseType = {
  transactionId: "",
  code: 0,
  message: "",
};

/** Map sportsbook API status to values the bet slip UI already handles. */
function mapApiStatusToUi(status: string): string {
  if (status === "accepted") return "pending";
  return status;
}

function mapBetTypeFromApi(api: string): betType {
  if (api === "single") return "single";
  if (api === "parlay") return "multi";
  return "multi";
}

export function mapBetHistoryApiRowToBetItem(row: BetHistoryApiRow): BetItemType {
  const startingOdds =
    typeof row.combinedOdds === "number" && row.combinedOdds > 0
      ? row.combinedOdds
      : 1;

  const sport: Sport = { id: 0, name: row.sportName || "" };
  const region: Region = { seqId: 0, id: null, name: null };
  const league: Competition = {
    seqId: 0,
    id: null,
    name: row.leagueName ?? null,
  };

  const title = row.firstEventName?.trim() || "";
  const parts = title
    ? title.split(/\s+vs\s+/i).map((s) => s.trim()).filter(Boolean)
    : [];
  const participants: Participant[] =
    parts.length > 0
      ? parts.map((name, i) => ({
          seqId: i,
          id: null,
          name,
          providerId: 0,
          providerName: "",
          home: i === 0,
        }))
      : [
          {
            seqId: 0,
            id: null,
            name: "—",
            providerId: 0,
            providerName: "",
          },
        ];

  const leg: BetLegType = {
    eventId: 0,
    sport,
    region,
    league,
    participants,
    market: { name: row.shortResult || "" },
    odds: [
      {
        id: "1",
        name: row.shortResult || "—",
        value: startingOdds,
        selected: true,
        currentValue: startingOdds,
        settlement: null,
      },
    ],
  };

  const uiStatus = mapApiStatusToUi(row.status);
  const stake = Number(row.stakeAmount) || 0;

  return {
    betId: row.betId,
    userId: "",
    startingOdds,
    betType: mapBetTypeFromApi(row.betType),
    legs: [leg],
    details: [leg],
    systemType: "",
    remainingStake: stake,
    autoCashoutSettings: null,
    stakeAmount: stake,
    status: uiStatus,
    cashoutHistory: [],
    cashoutAmount:
      row.actualPayout != null ? Number(row.actualPayout) : null,
    cashedOutAt: row.status === "cashed_out" ? row.settledAt : null,
    placedAt: row.createdAt,
    settledAt: row.settledAt,
    providerResponse: emptyProvider,
    metadata: {
      currency: row.currency,
      potentialPayout: row.potentialPayout,
      shortResult: row.shortResult,
    },
  };
}

/**
 * `GET /bets/history` — requires `Authorization: Bearer` on `instance`
 * (see integration guide).
 */
export const apiGetBetHistory = async (
  params?: BetHistoryQueryParams,
): Promise<BetHistoryResponseDto | null> => {
  try {
    const limit = params?.limit ?? 20;
    const page = params?.page ?? 1;
    const response = await instance.get<BetHistoryApiResponse>(
      "/bets/history",
      {
        params: {
          page,
          limit,
          sort: params?.sort ?? "newest",
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.betType ? { betType: params.betType } : {}),
          ...(params?.from ? { from: params.from } : {}),
          ...(params?.to ? { to: params.to } : {}),
          ...(params?.sportId != null ? { sportId: params.sportId } : {}),
          ...(params?.leagueId != null ? { leagueId: params.leagueId } : {}),
        },
      },
    );
    const body = response.data;
    const rows = body?.data ?? [];
    const bets = rows.map(mapBetHistoryApiRowToBetItem);
    const total = body?.total ?? 0;
    const lim = body?.limit ?? limit;
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, lim)));
    return {
      bets,
      total,
      page: body?.page ?? page,
      limit: lim,
      totalPages,
    };
  } catch (error) {
    console.error("Error getting bet history:", error);
    return null;
  }
};
