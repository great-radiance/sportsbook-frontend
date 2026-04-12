import { instance } from "../instance";

type responseOdds = [
  string | null, // oddId
  number | null, // value
  number | null, // impliedOdd
  number | null, // mv
  number | null, // column
  string | null, //status
  string | { e: string; o: string; h: string } | null, // name
  number | null, // sort
];
type responseMarkets = [
  string | null, // marketId
  string | null, // name
  responseOdds[],
  string | null, // status
  number | null, //sort
  number | null, //column
  number[] | null, //groups
];

type responseEvent = [
  number | null, // id
  string, // sport
  string | null, // region
  string | null, // league
  [string, boolean][] | null, // participants
  boolean | null, // outright
  number | null, // sportRadarId
  responseMarkets[] | null, // markets
  string | null, // status
  number | null, // startDate
];

type MatchesResponse = {
  data: {
    map: responseEvent[];
    marketsMeta: string[];
  };
};

export const apiGetOutrightMatchs = async (eventIds: number[]) => {
  const ids = [...new Set(eventIds)]
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return {
      data: [],
      marketsMeta: [],
    };
  }

  const response = await instance.post<MatchesResponse>(
    `/cybet/matches/PING-OUTRIGHT-EVENTS`,
    {
      eventIds: ids,
    },
  );

  return {
    data: response.data.data.map,
    marketsMeta: response.data.data.marketsMeta,
  };
};
