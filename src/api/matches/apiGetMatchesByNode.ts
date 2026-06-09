import { convertFromArrayToSnapshot } from "@/helpers/convertFromArrayToSnapshot";
import { instance } from "../instance";
import { MatchDataResponse } from "./apiGetMatchData";
import { getAppConfig } from "@/shared/config/appConfig";

export type apiGetMatchesByNodeResponse = {
  pre: MatchDataResponse[];
  live: MatchDataResponse[];
  outright: MatchDataResponse[];
};

export const apiGetMatchesByNode = async (nodeId: string) => {
  const response = await instance.get<apiGetMatchesByNodeResponse>(
    `users/sidebar/${nodeId}/events`,
  );
  return response.data;
};
