import { ScoreBoard, Clock, LiveStatus } from "@/shared/utils/types";
import { instance } from "../instance";
import { tEvent } from "@/types/tEvent";
import { instanceOdds88 } from "../instanceOdds88";
import { MatchDataResponse } from "./apiGetMatchData";

export type MatchesResponse = {
  data: MatchDataResponse[];
};

export type MatchesResponseOldVersion = {
  data: tEvent[];
};

type responseOdds = [
  string | null, // oddId
  number | null, // value
  number | null, // impliedOdd
  number | null, // mv
  number | null, // column
  string | null, //status
  string | { e: string; o: string; h: string } | null, // name
  number | null, // sort
];
type responseMarkets = [
  string | null, // marketId
  string | null, // name
  responseOdds[],
  string | null, // status
  number | null, //sort
  number | null, //column
  number[] | null, //groups
];

export type responseEvent = [
  number | null, // id
  string, // sport
  string | null, // region
  string | null, // league
  [string, boolean][] | null, // participants
  boolean | null, // outright
  number | null, // sportRadarId
  responseMarkets[] | null, // markets
  string | null, // status
  number | null, // startDate
  ScoreBoard | null | undefined, // scoreBoard
  Clock | null | undefined, // clock
  LiveStatus | null | undefined, // status
];

// export type MatchesResponse = {
//   data: {
//     map: responseEvent[];
//     marketsMeta: string[];
//   };
// };

export const apiGetMatches = async (
  eventIds: number[],
  type: "InPlay" | "PreMatch",
  sport: string,
) => {
  const ids = [...new Set(eventIds)]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return {
      data: [],
      marketsMeta: [],
    };
  }

  const response = await instance.post<MatchesResponse>(
    // `/cybet/matches/Matches?${query.toString()}`,
    `/cybet/matches/PING-EVENTS`,
    {
      eventIds: ids,
      type: type,
      sport: sport,
    },
  );

  return {
    data: response.data.data,
    // marketsMeta: response.data.data.marketsMeta,
  };
};

export const apiGetMatchesOldVersion = async (eventIds: number[]) => {
  const ids = [...new Set(eventIds)]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return [];
  }

  const query = new URLSearchParams();
  query.append("eventIds", ids.join(","));

  const response = await instanceOdds88.get<MatchesResponseOldVersion>(
    // `/cybet/matches/Matches?${query.toString()}`,
    `/events?tradingStatus=0&${query.toString()}`,
  );

  // for (const match of response.data.data) {
  //   const currentTime = Date.now();
  //   if (match.startDate < currentTime - 1000 * 60 * 60 * 10) {
  //     if (match.status === "In progress") {
  //       delete summarySportsLive.value.data[match.sport][match.region][
  //         match.league
  //       ][match.id];
  //       const sportCounts = summarySportsLive.value.counts[match.sport];
  //       if (sportCounts) {
  //         sportCounts.total -= 1;
  //         const regionCounts = sportCounts.regions?.[match.region];
  //         if (regionCounts) {
  //           regionCounts.total -= 1;
  //           const leagueCount = regionCounts.leagues?.[match.league];
  //           if (leagueCount) {
  //             regionCounts.leagues[match.league] -= 1;
  //           }
  //         }
  //       }
  //       delete response.data.data[match.id];
  //     }
  //     response.data.data = { ...response.data.data };
  //   }
  // }

  return response.data.data;
};
