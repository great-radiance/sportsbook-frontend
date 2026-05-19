import { instance } from "../instance";
import { unwrapApiData } from "../unwrapApiData";

export type AnalyticsPeriod = "today" | "7d" | "30d" | "90d" | "1y";
export type AnalyticsGranularity = "day" | "week" | "month";

export type AnalyticsQuery = {
  period?: AnalyticsPeriod;
  from?: string;
  to?: string;
  granularity?: AnalyticsGranularity;
};

export type AnalyticsPeriodRange = { from: string; to: string };

export type AnalyticsAllTimeStats = {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  parlayBets?: number;
  totalStaked: number;
  totalWon: number;
  netPnl: number;
  winRate: number;
  biggestWin?: number;
  biggestStake?: number;
  avgOdds?: number;
  avgStake?: number;
};

export type AnalyticsPeriodStats = {
  periodBets: number;
  wonBets: number;
  lostBets: number;
  periodStaked: number;
  periodWon: number;
  periodPnl: number;
  winRate: number;
};

export type AnalyticsStreak = {
  current: number;
  type: "win" | "loss" | string;
};

export type PlayerAnalyticsOverview = {
  period: AnalyticsPeriodRange;
  currency: string;
  allTime: AnalyticsAllTimeStats;
  periodStats: AnalyticsPeriodStats;
  streak: AnalyticsStreak;
};

export type AnalyticsSportRow = {
  id: number;
  name: string;
  selectionCount: number;
  betCount: number;
  totalStaked: number;
  totalWon: number;
  pnl: number;
  winRate: number;
  avgOdds?: number;
};

export type AnalyticsLeagueRow = {
  id: number;
  name: string;
  selectionCount: number;
  betCount: number;
  totalStaked: number;
  totalWon: number;
  pnl: number;
  winRate: number;
  avgOdds?: number;
};

export type PlayerAnalyticsSports = {
  bySport: AnalyticsSportRow[];
  byLeague: AnalyticsLeagueRow[];
  period?: AnalyticsPeriodRange;
  currency?: string;
};

export type AnalyticsTimelinePoint = {
  date: string;
  betsPlaced: number;
  totalStaked: number;
  totalWon: number;
  pnl: number;
  wonBets: number;
  lostBets: number;
  pendingBets?: number;
  avgStake?: number;
};

export type PlayerAnalyticsTimeline = {
  data: AnalyticsTimelinePoint[];
  granularity: AnalyticsGranularity;
  period: AnalyticsPeriodRange;
  currency: string;
};

/** `GET /users/me/analytics/overview` */
export async function apiGetPlayerAnalyticsOverview(
  params?: AnalyticsQuery,
): Promise<PlayerAnalyticsOverview> {
  const { data } = await instance.get<
    PlayerAnalyticsOverview | { data: PlayerAnalyticsOverview }
  >("/users/me/analytics/overview", { params });
  return unwrapApiData<PlayerAnalyticsOverview>(data);
}

/** `GET /users/me/analytics/sports` */
export async function apiGetPlayerAnalyticsSports(
  params?: AnalyticsQuery,
): Promise<PlayerAnalyticsSports> {
  const { data } = await instance.get<
    PlayerAnalyticsSports | { data: PlayerAnalyticsSports }
  >("/users/me/analytics/sports", { params });
  const inner = unwrapApiData<PlayerAnalyticsSports>(data);
  if (inner.bySport) return inner;
  return {
    bySport: (data as PlayerAnalyticsSports).bySport ?? [],
    byLeague: (data as PlayerAnalyticsSports).byLeague ?? [],
    period: (data as { period?: AnalyticsPeriodRange }).period,
    currency: (data as { currency?: string }).currency,
  };
}

/** `GET /users/me/analytics/timeline` */
export async function apiGetPlayerAnalyticsTimeline(
  params?: AnalyticsQuery,
): Promise<PlayerAnalyticsTimeline> {
  const { data } = await instance.get<
    PlayerAnalyticsTimeline | { data: AnalyticsTimelinePoint[] }
  >("/users/me/analytics/timeline", { params });
  const unwrapped = unwrapApiData<AnalyticsTimelinePoint[] | PlayerAnalyticsTimeline>(
    data,
  );
  if (Array.isArray(unwrapped)) {
    return {
      data: unwrapped,
      granularity: params?.granularity ?? "day",
      period: { from: "", to: "" },
      currency: "",
    };
  }
  return unwrapped;
}
