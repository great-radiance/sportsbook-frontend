import { instance } from "../instance";
import { MatchDataResponse } from "./apiGetMatchData";

export type OutrightResponse = {
  sports: {
    id: number;
    name: string;
    countries: {
      id: number;
      name: string;
      leagues: {
        id: number;
        name: string;
        events: MatchDataResponse[];
      }[];
    }[];
  }[];
  total: number;
};

export const apiGetOutrights = async (sport?: number) => {
  const response = await instance.get<OutrightResponse>(
    `users/events/outright`,
    { params: { sport: sport ?? undefined } },
  );
  return response.data;
};
