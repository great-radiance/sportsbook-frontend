import { tMarket, tParticipant } from "@/types/tEvent";
import { instance } from "../instance";
import { responseEvent } from "../matches/apiGetMatches";

export type tGetUpcomingMatchesResponse = {
  map: responseEvent[];
  marketsMeta: string[];
};

type tParam = {
  from?: number;
  to?: number;
  sport?: string;
  region?: string;
  competition?: string;
  limit?: number;
  offset?: number;
};

type tFilters = {
  sport?: string[];
  includeLive?: number;
  includeMarket?: number;
  // competition?: string;
};

export const apiGetUpcomingMatches = async (
  { from, to, sport, region, competition, limit, offset }: tParam,
  filters?: tFilters,
) => {
  const response = await instance.get<{ data: tGetUpcomingMatchesResponse }>(
    `cybet/matches/upcoming-fixtures`,
    {
      params: {
        from: from?.toString() || "",
        to: to?.toString() || "",
        sport: sport?.toString() || "",
        region: region?.toString() || "",
        competition: competition?.toString() || "",
        limit: limit?.toString() || "",
        offset: offset?.toString() || "",
      },
    },
  );

  return response.data.data;
};
