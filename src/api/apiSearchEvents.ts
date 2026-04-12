import { tParticipant } from "@/types/tEvent";
import { instance } from "./instance";
import qs from "qs";
import { responseEvent } from "./matches/apiGetMatches";

type tSearchEventResponse = {
  totalCount: number;
  page: number;
  limit: number;
  data: {
    map: responseEvent[];
    marketMeta: string[];
  };
};

type tParam = {
  q?: string;
  limit?: number;
  offset?: number;
};

export const apiSearchEvents = async (params: tParam) => {
  const response = await instance.get<tSearchEventResponse>(
    `/cybet/matches/search-keyword?${qs.stringify(params)}`,
  );
  return response.data;
};
