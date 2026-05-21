import { convertFromArrayToSnapshot } from "@/helpers/convertFromArrayToSnapshot";
import { instance } from "../instance";
import { MatchDataResponse } from "./apiGetMatchData";
import { getAppConfig } from "@/shared/config/appConfig";

export type MatchesResponse = {
  data: MatchDataResponse[];
};

export type ApiGetMatchesOptions = {
  /** Market type IDs to return per event (integration guide `marketIds`). */
  marketIds?: number[];
  tradingStatus?: number;
  sort?: "ASC" | "DESC";
};

export const apiGetMatches = async (
  eventIds: number[],
  options?: ApiGetMatchesOptions,
) => {
  const ids = [...new Set(eventIds)]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return [];

  const marketIds = [...new Set(options?.marketIds ?? [])]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const params = new URLSearchParams({
    tradingStatus: String(options?.tradingStatus ?? 0),
    lang: getAppConfig().lang ?? "en",
    eventIds: ids.join(","),
  });
  if (marketIds.length > 0) {
    params.set("marketIds", marketIds.join(","));
  }
  if (options?.sort) {
    params.set("sort", options.sort);
  }

  const response = await instance.get<{ data: any[] }>(
    `/odds88/events/selected?${params.toString()}`,
  );
  return response.data.data.map(
    (event) => convertFromArrayToSnapshot(event) as MatchDataResponse,
  );
};
