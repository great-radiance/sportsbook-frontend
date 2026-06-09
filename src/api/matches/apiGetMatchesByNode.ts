import { instance } from "../instance";
import { MatchDataResponse } from "./apiGetMatchData";

export type apiGetMatchesByNodeResponse = {
  pre: MatchDataResponse[];
  live: MatchDataResponse[];
  outright: MatchDataResponse[];
};

export const apiGetMatchesByNode = async (
  nodeId: string,
  isTrending: boolean = true,
) => {
  const response = await instance.get<apiGetMatchesByNodeResponse>(
    `users/sidebar/${nodeId}/events?isTrending=${isTrending}`,
  );
  return response.data;
};
