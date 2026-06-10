import { instance } from "../instance";
import type { MatchDataResponse } from "./apiGetMatchData";

export type LiveMatchesResponse = {
  data: {
    events: MatchDataResponse[];
    total: number;
    page: number;
    pageSize: number;
  };
};

export const apiGetLiveMatches = async () => {
  const response = await instance.get<{ data: MatchDataResponse[] }>(
    "users/events/live-matches",
  );
  return response.data.data;
};
