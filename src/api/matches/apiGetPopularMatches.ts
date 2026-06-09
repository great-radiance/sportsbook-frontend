import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";
import type { MatchDataResponse } from "./apiGetMatchData";

export type PopularMatchesResponse = {
  data: MatchDataResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type PopularMatchesParams = {
  page?: number;
  lang?: string;
};

export async function apiGetPopularMatches(
  params: PopularMatchesParams = {},
): Promise<PopularMatchesResponse> {
  const page = params.page ?? 1;
  const lang = params.lang ?? getAppConfig().lang;

  const { data } = await instance.get<PopularMatchesResponse>(
    `users/events/featured-matches?page=${page}&lang=${lang}`,
  );

  return data;
}
