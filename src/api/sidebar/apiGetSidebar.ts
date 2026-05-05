import { instanceOdds88 } from "../instanceOdds88";

export type tSummaryEventResponse = {
  id: number;
  // status: string;
  // startDate: number;
  // type: 1 | 2;
  outright: boolean;
};

export type tSportResponseOld = Record<
  string,
  Record<string, Record<string, [number, boolean, number][]>>
>;

export type tSportResponse = [
  number, // sportId
  string, // sportName
  [
    number, // regionId
    string, // regionName
    [
      number, // leagueId
      string, // leagueName
      [
        number, // eventId
        string, // eventName
        number, // status
        number, // tradingStatus
        string, // season
        [number, string][], // competitors
        string, // startTime
        boolean, // isOutright
        boolean, // isBetBuilderSuported
        any, // customDisplayData
      ][],
    ][],
  ][],
][];
// comment  sportId,sportName,[regionId,Name, [leagueId, Name, [eventId,Name,status,trandingStatus,season,[competitorId,Name][],startT,isOutri,isBetbuilderSuport, customDisplayData]]]][]
export type tLiveSidebarData = {
  // config: {
  //   sportSlug: string;
  //   order: number;
  //   regions: {
  //     regionSlug: string;
  //     order: number;
  //     leagues: {
  //       leagueSlug: string;
  //       order: number;
  //     }[];
  //   }[];
  //   selectedMarkets: string[]; // market slugs
  // }[];

  data: tSportResponse;
  counts: tCounts;
  liveTotalCount: number;
};

export type tCountTree = {
  total: number;
  regions?: {
    [regionName: string]: {
      total: number;
      leagues: {
        [leagueName: string]: number; // match count in that league
      };
    };
  };
};

export type tCounts = {
  [sportName: string]: tCountTree;
};

export const apiGetSidebar = async () => {
  const response = await instanceOdds88.get<{ data: tSportResponse }>(
    `/events/array?tradingStatus=0`,
  );

  console.log("response", response.data);

  // const config = [...response.data.config].sort((a, b) => a.order - b.order);
  // for (const s of config) {
  //   s.regions = [...s.regions].sort((a, b) => a.order - b.order);
  //   for (const r of s.regions) {
  //     r.leagues = [...r.leagues].sort((a, b) => a.order - b.order);
  //   }
  // }

  const resData = response.data.data;
  const counts = {} as tCounts;
  // for (const sport in resData) {
  //   const SportObj = resData[sport];
  //   if (!SportObj) {
  //     delete resData[sport];
  //     continue;
  //   }
  //   let sportTotal = 0;
  //   for (const region in SportObj) {
  //     const regionObj = SportObj[region];
  //     if (!region) {
  //       delete SportObj[region];
  //       continue;
  //     }
  //     let regionTotal = 0;
  //     const leagueCounts: Record<string, number> = {};
  //     for (const league in regionObj) {
  //       const leagueObj = regionObj[league];
  //       if (!leagueObj) {
  //         delete regionObj[league];
  //         continue;
  //       }
  //       if (isEmpty(leagueObj)) {
  //         delete regionObj[league];
  //         continue;
  //       }
  //       const leagueTotal = Object.keys(leagueObj).length;
  //       leagueCounts[league] = leagueTotal;
  //       regionTotal += leagueTotal;
  //     }
  //     if (isEmpty(regionObj)) {
  //       delete SportObj[region];
  //       continue;
  //     }
  //     // write region counts (only if region still exists)
  //     counts[sport] ??= { total: 0, regions: {} };
  //     counts[sport].regions![region] = {
  //       total: regionTotal,
  //       leagues: leagueCounts,
  //     };

  //     sportTotal += regionTotal;
  //   }
  //   if (isEmpty(SportObj)) {
  //     delete resData[sport];
  //     delete counts[sport];
  //     continue;
  //   }
  //   counts[sport] ??= { total: 0, regions: {} };
  //   counts[sport].total = sportTotal;
  // }

  return {
    // config: config,
    data: resData,
    counts: counts,
    liveTotalCount: Object.values(counts).reduce(
      (acc, curr) => acc + curr.total,
      0,
    ),
  };
};
