import { instance } from "../instance";
import { tSportResponse } from "../sidebar/apiGetSummaryArray";

/**
 * Response shape of `/cybet/matches/upcoming-fixtures`.
 *
 * `data` carries the same `tSportResponse` tuple tree as the live/prematch
 * sidebar — `[sportId, sportName, [[regionId, regionName, [[leagueId,
 * leagueName, eventId[]]]]]][]` — but the server filters by the `from`/`to`
 * time window and pages with `limit`/`offset` (and reports the page-agnostic
 * `total` count).
 */
export type tGetUpcomingMatchesResponse = {
  data: tSportResponse;
  total: number;
  offset: number;
  limit: number;
  ms: number;
};

type tParam = {
  /** Unix timestamp in seconds, inclusive lower bound. */
  from?: number;
  /** Unix timestamp in seconds, exclusive upper bound. */
  to?: number;
  /** Sport name (e.g. "Soccer"). */
  sportId?: number;
  regionId?: number;
  leagueId?: number;
  tradingStatus?: number;
  status?: number[];
  limit?: number;
  offset?: number;
};

export const apiGetUpcomingMatches = async ({
  from,
  to,
  sportId,
  regionId,
  leagueId,
  tradingStatus,
  status,
  limit,
  offset,
}: tParam): Promise<tGetUpcomingMatchesResponse> => {
  const params: Record<string, string | number> = {};
  if (from != null) params.from = String(from);
  if (to != null) params.to = String(to);
  if (sportId) params.sportId = sportId;
  if (regionId) params.regionId = regionId;
  if (leagueId) params.leagueId = leagueId;
  if (tradingStatus != null) params.tradingStatus = tradingStatus;
  if (status != null) params.status = status.join(",");
  if (limit != null) params.limit = String(limit);
  if (offset != null) params.offset = String(offset);

  const response = await instance.get<tGetUpcomingMatchesResponse>(
    `odds88/events/upcoming/array`,
    { params },
  );
  return response.data;
};
