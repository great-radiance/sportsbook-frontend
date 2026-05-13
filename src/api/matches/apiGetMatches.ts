import { convertFromArrayToSnapshot } from "@/helpers/convertFromArrayToSnapshot";
import { instanceOdds88 } from "../instanceOdds88";
import { MatchDataResponse } from "./apiGetMatchData";
import { getAppConfig } from "@/shared/config/appConfig";

export type MatchesResponse = {
  data: MatchDataResponse[];
};

export const apiGetMatches = async (eventIds: number[]) => {
  const ids = [...new Set(eventIds)]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  // console.log("api ids", ids);
  if (ids.length === 0) return [];

  const response = await instanceOdds88.get<{ data: any[] }>(
    `/odds88/events/selected?tradingStatus=0&lang=${getAppConfig().lang}&eventIds=${ids.join(",")}`,
  );
  const newEvents = response.data.data.map(
    (event) => convertFromArrayToSnapshot(event) as MatchDataResponse,
  );
  console.log("converted newEvents", newEvents);

  return newEvents;
};
