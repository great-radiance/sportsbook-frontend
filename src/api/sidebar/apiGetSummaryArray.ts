import { summaryData } from "@/state/summarySports";
import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";

export type tSummaryEventResponse = [
  number, // eventId
  string, // eventName
  number, // status
  number, // tradingStatus
  string, // season
  [number, string][], // competitors
  string, // startTime
  boolean, // isOutright
  boolean, // isBetBuilderSupported
  any, // customDisplayData
];

export type tSportResponse = [
  number, // sportId
  string, // sportName
  [
    number, // regionId
    string, // regionName
    [
      number, // leagueId
      string, // leagueName

      number[], // eventId
      // string, // eventName
      // number, // status
      // number, // tradingStatus
      // string, // season
      // [number, string][], // competitors
      // string, // startTime
      // boolean, // isOutright
      // boolean, // isBetBuilderSupported
      // any, // customDisplayData
    ][],
  ][],
][];
// comment  sportId,sportName,[regionId,Name, [leagueId, Name, [eventId,Name,status,trandingStatus,season,[competitorId,Name][],startT,isOutri,isBetbuilderSuport, customDisplayData]]]][]

export type tCountTree = {
  total: number;
  regions?: {
    [regionId: number]: {
      total: number;
      leagues: {
        [leagueId: number]: number; // match count in that league
      };
    };
  };
};

export type tCounts = {
  [sportId: number]: tCountTree;
};

type tProps = {
  status: number[];
  tradingStatus: number;
  isOutright: boolean;
  isBetBuilderSupported?: boolean;
};

export const apiGetSummaryArray = async ({
  status = [1],
  tradingStatus = 0,
  isOutright = false,
  isBetBuilderSupported,
}: tProps): Promise<summaryData> => {
  const params = new URLSearchParams();
  params.append("status", status.join(","));
  params.append("tradingStatus", tradingStatus.toString());
  params.append("isOutright", isOutright.toString());
  params.append("lang", getAppConfig().lang);
  if (isBetBuilderSupported) {
    params.append("isBetBuilderSupported", isBetBuilderSupported.toString());
  }
  const response = await instance.get<{ data: tSportResponse }>(
    `/odds88/events/array?${params.toString()}`,
  );

  // const config = [...response.data.config].sort((a, b) => a.order - b.order);
  // for (const s of config) {
  //   s.regions = [...s.regions].sort((a, b) => a.order - b.order);
  //   for (const r of s.regions) {
  //     r.leagues = [...r.leagues].sort((a, b) => a.order - b.order);
  //   }
  // }

  const resData = response.data.data;
  const counts = {} as tCounts;
  for (const sport of resData) {
    const regionArray = sport[2];
    if (!regionArray) {
      continue;
    }
    let sportTotal = 0;
    for (const region of regionArray) {
      const leagueArray = region[2];
      if (!leagueArray) {
        continue;
      }
      let regionTotal = 0;
      const leagueCounts: Record<number, number> = {};
      for (const league of leagueArray) {
        const eventArray = league[2];
        if (!eventArray) {
          continue;
        }
        const leagueTotal = eventArray.length;
        leagueCounts[league[0]] = leagueTotal;
        regionTotal += leagueTotal;
      }
      // write region counts (only if region still exists)
      counts[sport[0]] ??= { total: 0, regions: {} };
      counts[sport[0]].regions![region[0]] = {
        total: regionTotal,
        leagues: leagueCounts,
      };

      sportTotal += regionTotal;
    }
    counts[sport[0]] ??= { total: 0, regions: {} };
    counts[sport[0]].total = sportTotal;
  }

  return {
    data: [],
    counts: counts as tCountTree,
    TotalCount: Object.values(counts).reduce(
      (acc, curr) => acc + curr.total,
      0,
    ),
  };
};
