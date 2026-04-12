import {
  Sport,
  Region,
  Competition,
  Participant,
  Live,
  Market,
  ScoreBoard,
  Clock,
  LiveStats,
  LiveStatus,
} from "@/shared/utils/types";
import { instance } from "../instance";
import qs from "qs";
import { tEvent } from "@/types/tEvent";
import { summarySportsLive } from "@/state/summarySports";

export type MatchesResponseWithObject = {
  data: tEvent[];
};

export const apiGetMatchesWithObject = async (eventIds: number[]) => {
  const ids = [...new Set(eventIds)]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return [];
  }

  const query = new URLSearchParams();
  query.append("ids", ids.join(","));

  const response = await instance.get<MatchesResponseWithObject>(
    // `/cybet/matches/Matches?${query.toString()}`,
    `/cybet/matches/MatchesMarkets?${query.toString()}`,
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
