import { instanceOdds88 } from "../instanceOdds88";
import { MatchDataResponse } from "./apiGetMatchData";

export const apiGetMatches = async (eventIds: number[]) => {
  const ids = [...new Set(eventIds)]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  console.log("api ids", ids);

  const response = await instanceOdds88.get<{ data: MatchDataResponse[] }>(
    `/events/selected?tradingStatus=0&eventIds=${ids.join(",")}`,
  );

  return response.data.data;
};
