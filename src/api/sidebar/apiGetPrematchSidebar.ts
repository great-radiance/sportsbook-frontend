import { instance } from "../instance";
import { outRightSummarySports } from "@/state/summarySports";
import { tParticipant } from "@/types/tEvent";
import { isEmpty } from "@/helpers/isEmpty";

export type tSportResponse = Record<
  string,
  Record<string, Record<string, [number, boolean, number][]>>
>;

export type tPrematchSidebarData = {
  data: tSportResponse;
  counts: tCounts;
  permatchTotalCount: number;
};

export type tCountTree = {
  total: number;
  regions?: Record<
    string,
    {
      total: number;
      leagues: Record<string, number>;
    }
  >;
};

export type tCounts = {
  [sportName: string]: tCountTree;
};

export const apiGetPrematchSidebar = async () => {
  const response = await instance.get<{ data: tSportResponse }>(
    `/cybet/matches/PING-SIDEBAR-NO-OUTRIGHT?type=2`,
  );

  // const config = [...response.data.config].sort((a, b) => a.order - b.order);
  // for (const s of config) {
  //   s.regions = [...s.regions].sort((a, b) => a.order - b.order);
  //   for (const r of s.regions) {
  //     r.leagues = [...r.leagues].sort((a, b) => a.order - b.order);
  //   }
  // }

  const resData = response.data.data;
  const counts: tCounts = {};

  for (const sport in resData) {
    const sportObj = resData[sport];
    if (!sportObj) {
      delete resData[sport];
      continue;
    }

    let sportTotal = 0;

    for (const region in sportObj) {
      const regionObj = sportObj[region];
      if (!regionObj) {
        delete sportObj[region];
        continue;
      }

      let regionTotal = 0;
      const leagueCounts: Record<string, number> = {};

      for (const league in regionObj) {
        const leagueObj = regionObj[league];
        if (!leagueObj) {
          delete regionObj[league];
          continue;
        }

        // remove outrights (same as you already do)
        // for (const eventIdStr of leagueObj) {
        //   const id = eventIdStr[0];
        //   const ev = eventIdStr[1];
        //   if (ev) {
        //     outrights[sport] ??= {};
        //     outrights[sport][region] ??= {};
        //     outrights[sport][region][league] ??= [];
        //     outrights[sport][region][league].push([id, ev]);
        //   }
        // }

        if (isEmpty(leagueObj)) {
          delete regionObj[league];
          continue;
        }

        const leagueTotal = Object.keys(leagueObj).length;
        leagueCounts[league] = leagueTotal;
        regionTotal += leagueTotal;
      }

      if (isEmpty(regionObj)) {
        delete sportObj[region];
        continue;
      }

      // write region counts (only if region still exists)
      counts[sport] ??= { total: 0, regions: {} };
      counts[sport].regions![region] = {
        total: regionTotal,
        leagues: leagueCounts,
      };

      sportTotal += regionTotal;
    }

    if (isEmpty(sportObj)) {
      delete resData[sport];
      delete counts[sport];
      continue;
    }

    // write sport total (only if sport still exists)
    counts[sport] ??= { total: 0, regions: {} };
    counts[sport].total = sportTotal;

    // // optional cleanup if sport ended up with no regions in counts
    // if (!counts[sport].regions || Object.keys(counts[sport].regions!).length === 0) {
    //   delete counts[sport];
    // }
  }
  // outRightSummarySports.value = outrights;
  // outRightSummarySports.value = { ...outRightSummarySports.value };
  return {
    // config: config,
    data: resData,
    counts: counts,
    permatchTotalCount: Object.values(counts).reduce(
      (acc, curr) => acc + curr.total,
      0,
    ),
  };
};
