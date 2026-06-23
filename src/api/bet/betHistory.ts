import {
  BetItemType,
  BetLegType,
  betType,
  ProviderResponseType,
  type SystemCombinationDisplay,
} from "@/shared/utils/bet";
import type {
  Competition,
  Participant,
  Region,
  Sport,
} from "@/shared/utils/types";
import { instance } from "../instance";
import type { BetDetailSelection } from "./apiBetDetail";
import { mapSelectionsToBetLegs } from "./mapBetSelections";
import { mapDescriptionToBetLegs } from "./mapBetDescription";
import type { PlaceBetDescriptionItem } from "./placeBet";

/** History list is `{ total, page, limit, data: [] }` — not the same as `{ data: T }` detail wrap. */
function parseBetHistoryResponse(raw: unknown): BetHistoryApiResponse {
  if (!raw || typeof raw !== "object") {
    return { total: 0, page: 1, pageSize: 20, data: [] };
  }

  const outer = raw as Record<string, unknown>;

  // `{ data: { total, page, limit, data: [...] } }`
  if (
    outer.data &&
    typeof outer.data === "object" &&
    !Array.isArray(outer.data) &&
    Array.isArray((outer.data as BetHistoryApiResponse).data)
  ) {
    return outer.data as BetHistoryApiResponse;
  }

  // `{ total, page, limit, data: [...] }`
  if (Array.isArray(outer.data) && "total" in outer) {
    return outer as BetHistoryApiResponse;
  }

  return { total: 0, page: 1, pageSize: 20, data: [] };
}

/** One row from `GET /users/bets` — regular bet or system group. */
export type BetHistoryApiRow = {
  _id?: string;
  betId?: string;
  userId?: string;
  operatorId?: string;
  odds88BetId?: string;
  betType: string;
  systemGroupId?: string;
  systemType?: string;
  status: string;
  stake?: number;
  potentialPayout?: number;
  currency: string;
  combinedOdds?: number;
  createdAt: string;
  updatedAt?: string;
  selections?: BetDetailSelection[];
  description?: PlaceBetDescriptionItem[];
  /** Legacy list fields — prefer `description` when present. */
  sportName?: string;
  leagueName?: string;
  firstEventName?: string;
  shortResult?: string;
  stakeAmount?: number;
  remainingStake?: number;
  actualPayout?: number | null;
  totalCashedOutAmount?: number | null;
  cashoutAt?: string | null;
  settledAt?: string | null;
  selectionCount?: number;
  cashout?: {
    canCashout?: boolean;
    availableAmount?: number | null;
  };
  cashoutAmount?: number | null;
  availableCashoutAmount?: number | null;
  /** System group fields */
  totalStake?: number;
  combinationCount?: number;
  totalSelections?: number;
  unitStake?: number | null;
  systemCombinations?: SystemCombinationDisplay[];
  subBetIds?: string[];
  subBets?: BetHistoryApiRow[];
};

export type BetHistoryApiResponse = {
  total: number;
  page: number;
  pageSize: number;
  data: BetHistoryApiRow[];
};

export interface BetHistoryQueryParams {
  page?: number;
  limit?: number;
  sort?: "newest" | "oldest";
  /** One or more statuses. Multiple values are sent as `status=a,b,c`. */
  status?: string | string[];
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

const historyInFlight = new Map<
  string,
  Promise<BetHistoryResponseDto | null>
>();

function statusKey(status?: string | string[]): string {
  if (status == null) return "";
  return Array.isArray(status) ? status.join(",") : status;
}

function historyRequestKey(
  params?: BetHistoryQueryParams & { tab?: "open" | "settled" },
): string {
  return JSON.stringify({
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    sort: params?.sort ?? "newest",
    status: statusKey(params?.status),
    tab: params?.tab ?? "",
    betType: params?.betType ?? "",
    from: params?.from ?? "",
    to: params?.to ?? "",
    sportId: params?.sportId ?? "",
    leagueId: params?.leagueId ?? "",
  });
}

const emptyProvider: ProviderResponseType = {
  transactionId: "",
  code: 0,
  message: "",
};

const OPEN_BET_API_STATUSES = ["accepted", "pending"] as const;
const SETTLED_BET_API_STATUSES = [
  "won",
  "lost",
  "voided",
  "cashed_out",
  "partially_cashed_out",
  "cancelled",
  "rejected",
] as const;
const OPEN_BET_API_STATUS_SET = new Set<string>(OPEN_BET_API_STATUSES);
const SETTLED_BET_API_STATUS_SET = new Set<string>(SETTLED_BET_API_STATUSES);

async function fetchHistoryPage(
  params: BetHistoryQueryParams,
): Promise<BetHistoryApiResponse> {
  const statusParam = Array.isArray(params.status)
    ? params.status.join(",")
    : params.status;

  const response = await instance.get<
    BetHistoryApiResponse | { data: BetHistoryApiResponse }
  >("users/bets", {
    params: {
      page: params.page ?? 1,
      pageSize: params.limit ?? 20,
      // sort: params.sort ?? "newest",
      ...(statusParam ? { status: statusParam } : {}),
      ...(params.betType ? { betType: params.betType } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      // ...(params.sportId != null ? { sportId: params.sportId } : {}),
      // ...(params.leagueId != null ? { leagueId: params.leagueId } : {}),
    },
  });
  return parseBetHistoryResponse(response.data);
}

function mapBetTypeFromApi(api: string): betType {
  if (api === "single") return "single";
  if (api === "parlay") return "multi";
  if (api === "system") return "system";
  return "multi";
}

function isSystemBetHistoryRow(row: BetHistoryApiRow): boolean {
  return row.betType === "system" && Array.isArray(row.subBets);
}

function normalizeHistorySelections(
  selections?: BetDetailSelection[],
): BetDetailSelection[] {
  if (!selections?.length) return [];
  return selections.map((sel) => ({
    ...sel,
    status: sel.status ?? "accepted",
    oddsAtPlacement:
      sel.oddsAtPlacement ??
      (sel as BetDetailSelection & { odds?: number }).odds ??
      0,
  }));
}

function resolveBetId(row: BetHistoryApiRow): string {
  return row.betId ?? row._id ?? row.systemGroupId ?? "";
}

function descriptionMatchingSelections(
  description: PlaceBetDescriptionItem[] | undefined,
  selections: BetDetailSelection[],
): PlaceBetDescriptionItem[] | undefined {
  if (!description?.length || !selections.length) return description;
  return description;
}

function summaryLegFromRow(
  row: BetHistoryApiRow,
  startingOdds: number,
): BetLegType {
  const sport: Sport = { id: 0, name: row.sportName || "" };
  const region: Region = { seqId: 0, id: null, name: null };
  const league: Competition = {
    seqId: 0,
    id: null,
    name: row.leagueName ?? null,
  };

  const title = row.firstEventName?.trim() || "";
  const parts = title
    ? title
        .split(/\s+vs\s+/i)
        .map((s) => s.trim())
        .filter(Boolean)
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

  return {
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
}

export function mapBetHistoryApiRowToBetItem(
  row: BetHistoryApiRow,
): BetItemType {
  const startingOdds =
    typeof row.combinedOdds === "number" && row.combinedOdds > 0
      ? row.combinedOdds
      : 1;

  const selections = normalizeHistorySelections(row.selections);
  const selectionLegs = mapSelectionsToBetLegs(selections);
  const scopedDescription = descriptionMatchingSelections(
    row.description,
    selections,
  );
  const descriptionLegs = mapDescriptionToBetLegs(
    scopedDescription,
    selections,
  );
  const legs =
    descriptionLegs.length > 0
      ? descriptionLegs
      : selectionLegs.length > 0
        ? selectionLegs
        : [summaryLegFromRow(row, startingOdds)];

  const stake = Number(row.stakeAmount ?? row.stake) || 0;
  const remainingStake =
    typeof row.remainingStake === "number" ? row.remainingStake : stake;

  const cashedAmount =
    row.totalCashedOutAmount != null
      ? Number(row.totalCashedOutAmount)
      : row.actualPayout != null
        ? Number(row.actualPayout)
        : null;

  const apiCashoutAmount =
    row.availableCashoutAmount ??
    row.cashout?.availableAmount ??
    (row.cashoutAmount != null && row.cashoutAmount > 0
      ? row.cashoutAmount
      : null);

  const betId = resolveBetId(row);
  const legCount = legs.length || row.selectionCount || 1;
  const displayBetType =
    row.betType === "system" && !row.subBets?.length
      ? legCount <= 1
        ? "single"
        : "multi"
      : mapBetTypeFromApi(row.betType);

  return {
    _id: row._id ?? betId,
    betId,
    userId: row.userId ?? "",
    startingOdds,
    betType: displayBetType,
    legs,
    details: legs,
    systemType: row.systemType ?? "",
    systemGroupId: row.systemGroupId,
    remainingStake,
    autoCashoutSettings: null,
    stakeAmount: stake,
    status: row.status,
    cashoutHistory: [],
    cashoutAmount: cashedAmount,
    cashedOutAt: (() => {
      if (row.cashoutAt) return row.cashoutAt;
      if (row.status === "cashed_out") return row.settledAt ?? null;
      return null;
    })(),
    placedAt: row.createdAt,
    settledAt: row.settledAt ?? null,
    providerResponse: emptyProvider,
    metadata: {
      currency: row.currency,
      potentialPayout: row.potentialPayout,
      actualPayout: row.actualPayout,
      shortResult: row.shortResult,
      selectionCount: row.selectionCount ?? legCount,
      apiCashoutAmount,
      canCashout:
        row.cashout?.canCashout ??
        (apiCashoutAmount != null && apiCashoutAmount > 0),
    },
  };
}

function mapBetHistorySubBetToBetItem(
  subBet: BetHistoryApiRow,
  systemGroupId: string,
): BetItemType {
  const item = mapBetHistoryApiRowToBetItem({
    ...subBet,
    betId: subBet.betId ?? subBet._id,
    stakeAmount: subBet.stakeAmount ?? subBet.stake,
  });

  const legCount = item.legs.length || 1;

  return {
    ...item,
    betType: legCount <= 1 ? "single" : "multi",
    systemGroupId,
    isSystemGroup: false,
    metadata: {
      ...item.metadata,
      isSystemSubBet: true,
      selectionCount: legCount,
    },
  };
}

function mapSystemBetHistoryRowToBetItem(row: BetHistoryApiRow): BetItemType {
  const systemGroupId =
    row.systemGroupId ?? row._id ?? row.betId ?? "";
  const subBets = (row.subBets ?? []).map((subBet) =>
    mapBetHistorySubBetToBetItem(subBet, systemGroupId),
  );
  const totalStake = Number(row.totalStake) || 0;

  return {
    _id: row._id ?? systemGroupId,
    betId: systemGroupId,
    systemGroupId,
    isSystemGroup: true,
    subBets,
    userId: row.userId ?? subBets[0]?.userId ?? "",
    startingOdds: 0,
    betType: "system",
    legs: [],
    details: [],
    systemType: row.systemType ?? "",
    remainingStake: totalStake,
    autoCashoutSettings: null,
    stakeAmount: totalStake,
    status: row.status,
    cashoutHistory: [],
    cashoutAmount: null,
    cashedOutAt: null,
    placedAt: row.createdAt,
    settledAt: row.settledAt ?? null,
    providerResponse: emptyProvider,
    metadata: {
      currency: row.currency,
      combinationCount: row.combinationCount,
      totalSelections: row.totalSelections,
      systemCombinations: row.systemCombinations,
      unitStake: row.unitStake,
      selectionCount: row.totalSelections ?? subBets.length,
    },
  };
}

/** Map one history API row — system groups or regular bets. */
export function mapBetHistoryRowToBetItem(row: BetHistoryApiRow): BetItemType {
  if (isSystemBetHistoryRow(row)) {
    return mapSystemBetHistoryRowToBetItem(row);
  }
  return mapBetHistoryApiRowToBetItem(row);
}

export function filterBetsByTab(
  rows: BetHistoryApiRow[],
  tab: "open" | "settled",
): BetHistoryApiRow[] {
  if (tab === "open") {
    return rows.filter((r) => OPEN_BET_API_STATUS_SET.has(r.status));
  }
  return rows.filter((r) => SETTLED_BET_API_STATUS_SET.has(r.status));
}

function statusForTab(
  tab: "open" | "settled" | undefined,
  explicit: string | string[] | undefined,
): string | string[] | undefined {
  if (explicit) return explicit;
  if (tab === "open") return [...OPEN_BET_API_STATUSES];
  if (tab === "settled") return [...SETTLED_BET_API_STATUSES];
  return undefined;
}

async function fetchBetHistoryInternal(
  params?: BetHistoryQueryParams & { tab?: "open" | "settled" },
): Promise<BetHistoryResponseDto | null> {
  try {
    const limit = params?.limit ?? 20;
    const page = params?.page ?? 1;
    const tab = params?.tab;

    const { tab: _tab, status, ...rest } = params ?? {};

    const body = await fetchHistoryPage({
      ...rest,
      page,
      limit,
      status: statusForTab(tab, status),
    });

    const rows = body.data ?? [];
    const total = body.total ?? rows.length;
    const respPage = body.page ?? page;
    const respLimit = body.pageSize ?? limit;

    const bets = rows.map((row) => mapBetHistoryRowToBetItem(row));
    const totalPages = Math.max(1, Math.ceil(total / Math.max(1, respLimit)));

    return {
      bets,
      total,
      page: respPage,
      limit: respLimit,
      totalPages,
    };
  } catch (error) {
    console.error("Error getting bet history:", error);
    return null;
  }
}

/** `GET /bets/history` — deduped in-flight; list only (detail via `GET /bets/:betId`). */
export const apiGetBetHistory = async (
  params?: BetHistoryQueryParams & { tab?: "open" | "settled" },
): Promise<BetHistoryResponseDto | null> => {
  const key = historyRequestKey(params);
  const existing = historyInFlight.get(key);
  if (existing) return existing;

  const promise = fetchBetHistoryInternal(params).finally(() => {
    historyInFlight.delete(key);
  });
  historyInFlight.set(key, promise);
  return promise;
};
