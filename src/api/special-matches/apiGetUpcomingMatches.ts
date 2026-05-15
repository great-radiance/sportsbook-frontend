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
  sport?: string;
  region?: string;
  competition?: string;
  limit?: number;
  offset?: number;
};

export const apiGetUpcomingMatches = async ({
  from,
  to,
  sport,
  region,
  competition,
  limit,
  offset,
}: tParam): Promise<tGetUpcomingMatchesResponse> => {
  const response = await instance.get<tGetUpcomingMatchesResponse>(
    `odds88/events/upcoming/array`,
    {
      params: {
        from: from?.toString() || "",
        to: to?.toString() || "",
        sport: sport || "",
        region: region || "",
        competition: competition || "",
        limit: limit?.toString() || "",
        offset: offset?.toString() || "",
      },
    },
  );
  return response.data;
};
