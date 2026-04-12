import { instance } from "../instance";
import { tSportResponse } from "./apiGetPrematchSidebar";

export type tOutrightResponse = {
  data: tSportResponse;
};

export const apiGetOutright = async () => {
  const response = await instance.get<tOutrightResponse>(
    `/cybet/matches/PING-OUTRIGHT`,
  );
  return response.data.data;
};
