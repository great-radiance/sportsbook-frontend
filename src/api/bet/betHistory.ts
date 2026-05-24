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
import type { BetDetailSelection } from "./apiBetDetail";
import { mapSelectionsToBetLegs } from "./mapBetSelections";

/** History list is `{ total, page, limit, data: [] }` — not the same as `{ data: T }` detail wrap. */
function parseBetHistoryResponse(raw: unknown): BetHistoryApiResponse {
  if (!raw || typeof raw !== "object") {
    return { total: 0, page: 1, limit: 20, data: [] };
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

  return { total: 0, page: 1, limit: 20, data: [] };
}

/** One row from `GET /bets/history`. */
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
  remainingStake?: number;
  acceptedAt?: string | null;
  cashoutAt?: string | null;
  totalCashedOutAmount?: number | null;
  cashoutAmount?: number | null;
  selectionCount?: number;
  firstEventName?: string;
  sportName?: string;
  leagueName?: string;
  shortResult?: string;
  selections?: BetDetailSelection[];
  cashout?: {
    availableAmount: number;
    canCashout: boolean;
    updatedAt?: string;
  };
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

const historyInFlight = new Map<string, Promise<BetHistoryResponseDto | null>>();

function historyRequestKey(
  params?: BetHistoryQueryParams & { tab?: "open" | "settled" },
): string {
  return JSON.stringify({
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    sort: params?.sort ?? "newest",
    status: params?.status ?? "",
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

const OPEN_BET_API_STATUSES = new Set(["accepted", "pending"]);
const SETTLED_BET_API_STATUSES = [
  "won",
  "lost",
  "voided",
  "cashed_out",
  "partially_cashed_out",
  "cancelled",
  "rejected",
] as const;
const SETTLED_BET_API_STATUS_SET = new Set<string>(SETTLED_BET_API_STATUSES);

function dedupeHistoryRows(rows: BetHistoryApiRow[]): BetHistoryApiRow[] {
  const byId = new Map<string, BetHistoryApiRow>();
  for (const row of rows) {
    if (!row?.betId) continue;
    byId.set(row.betId, row);
  }
  return [...byId.values()];
}

function sortHistoryRows(
  rows: BetHistoryApiRow[],
  sort: "newest" | "oldest",
): BetHistoryApiRow[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sort === "oldest" ? ta - tb : tb - ta;
  });
}

async function fetchHistoryPage(
  params: BetHistoryQueryParams,
): Promise<BetHistoryApiResponse> {
  const response = await instance.get<
    BetHistoryApiResponse | { data: BetHistoryApiResponse }
  >("/bets/history", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      sort: params.sort ?? "newest",
      ...(params.status ? { status: params.status } : {}),
      ...(params.betType ? { betType: params.betType } : {}),
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
      ...(params.sportId != null ? { sportId: params.sportId } : {}),
      ...(params.leagueId != null ? { leagueId: params.leagueId } : {}),
    },
  });
  return parseBetHistoryResponse(response.data);
}

async function fetchOpenBetRows(
  params: BetHistoryQueryParams,
): Promise<{ rows: BetHistoryApiRow[]; total: number; page: number; limit: number }> {
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const sort = params.sort ?? "newest";

  const body = await fetchHistoryPage({
    ...params,
    page,
    limit,
    sort,
    status: "accepted",
  });

  let rows = body.data ?? [];
  rows = rows.filter((r) => OPEN_BET_API_STATUSES.has(r.status));

  return {
    rows,
    total: body.total ?? rows.length,
    page: body.page ?? page,
    limit: body.limit ?? limit,
  };
}

/** Merge settled statuses — API accepts one `status` per request. */
async function fetchSettledBetRows(
  params: BetHistoryQueryParams,
): Promise<{ rows: BetHistoryApiRow[]; total: number; page: number; limit: number }> {
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const sort = params.sort ?? "newest";
  const fetchLimit = 100;

  const bodies = await Promise.all(
    SETTLED_BET_API_STATUSES.map((status) =>
      fetchHistoryPage({
        ...params,
        status,
        page: 1,
        limit: fetchLimit,
        sort,
      }).catch(() => ({ total: 0, page: 1, limit: fetchLimit, data: [] })),
    ),
  );

  const merged = sortHistoryRows(
    dedupeHistoryRows(bodies.flatMap((b) => b.data ?? [])),
    sort,
  );
  const total = merged.length;
  const start = (page - 1) * limit;

  return {
    rows: merged.slice(start, start + limit),
    total,
    page,
    limit,
  };
}

function mapBetTypeFromApi(api: string): betType {
  if (api === "single") return "single";
  if (api === "parlay") return "multi";
  return "multi";
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

  const selectionLegs = mapSelectionsToBetLegs(row.selections);
  const legs =
    selectionLegs.length > 0
      ? selectionLegs
      : [summaryLegFromRow(row, startingOdds)];

  const stake = Number(row.stakeAmount) || 0;
  const remainingStake =
    typeof row.remainingStake === "number" ? row.remainingStake : stake;

  const cashedAmount =
    row.totalCashedOutAmount != null
      ? Number(row.totalCashedOutAmount)
      : row.actualPayout != null
        ? Number(row.actualPayout)
        : null;

  return {
    betId: row.betId,
    userId: "",
    startingOdds,
    betType: mapBetTypeFromApi(row.betType),
    legs,
    details: legs,
    systemType: "",
    remainingStake,
    autoCashoutSettings: null,
    stakeAmount: stake,
    status: row.status,
    cashoutHistory: [],
    cashoutAmount: cashedAmount,
    cashedOutAt:
      row.cashoutAt ?? (row.status === "cashed_out" ? row.settledAt : null),
    placedAt: row.createdAt,
    settledAt: row.settledAt,
    providerResponse: emptyProvider,
    metadata: {
      currency: row.currency,
      potentialPayout: row.potentialPayout,
      actualPayout: row.actualPayout,
      shortResult: row.shortResult,
      selectionCount: row.selectionCount,
      apiCashoutAmount:
        row.cashout?.availableAmount ??
        (row.cashoutAmount != null && row.cashoutAmount > 0
          ? row.cashoutAmount
          : null),
      canCashout: row.cashout?.canCashout,
    },
  };
}

export function filterBetsByTab(
  rows: BetHistoryApiRow[],
  tab: "open" | "settled",
): BetHistoryApiRow[] {
  if (tab === "open") {
    return rows.filter((r) => OPEN_BET_API_STATUSES.has(r.status));
  }
  return rows.filter((r) => SETTLED_BET_API_STATUS_SET.has(r.status));
}

async function fetchBetHistoryInternal(
  params?: BetHistoryQueryParams & { tab?: "open" | "settled" },
): Promise<BetHistoryResponseDto | null> {
  try {
    const limit = params?.limit ?? 20;
    const page = params?.page ?? 1;
    const tab = params?.tab;

  const { status: _status, tab: _tab, ...rest } = params ?? {};

    let rows: BetHistoryApiRow[] = [];
    let total = 0;
    let respPage = page;
    let respLimit = limit;

    if (tab === "open") {
      const open = await fetchOpenBetRows({ ...rest, page, limit });
      rows = open.rows;
      total = open.total;
      respPage = open.page;
      respLimit = open.limit;
    } else if (tab === "settled") {
      const settled = await fetchSettledBetRows({ ...rest, page, limit });
      rows = settled.rows;
      total = settled.total;
      respPage = settled.page;
      respLimit = settled.limit;
    } else {
      const body = await fetchHistoryPage({
        ...rest,
        page,
        limit,
        sort: params?.sort ?? "newest",
        ...(params?.status ? { status: params.status } : {}),
      });
      rows = body.data ?? [];
      total = body.total ?? rows.length;
      respPage = body.page ?? page;
      respLimit = body.limit ?? limit;
    }

    const bets = rows.map((row) => mapBetHistoryApiRowToBetItem(row));
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
