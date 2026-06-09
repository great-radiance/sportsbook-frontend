import { instance } from "../instance";
import { MatchDataResponse } from "./apiGetMatchData";

type UpcomingLeagueNode = {
  id: number;
  name: string;
  events?: MatchDataResponse[];
};

type UpcomingRegionNode = {
  id: number;
  name: string;
  leagues?: UpcomingLeagueNode[];
};

export type UpcomingBySportResponse = {
  regions?: UpcomingRegionNode[];
};

export const apiGetUpcomingBySport = async (
  dateFrom: number,
  dateTo: number,
  sport: number,
): Promise<UpcomingBySportResponse> => {
  const response = await instance.get<UpcomingBySportResponse>(
    `users/events/upcoming-by-sport?dateFrom=${dateFrom}&dateTo=${dateTo}&sport=${sport}`,
  );
  return response.data;
};
