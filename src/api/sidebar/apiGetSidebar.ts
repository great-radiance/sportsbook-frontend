import { summaryData } from "@/state/summarySports";
import { instanceOdds88 } from "../instanceOdds88";
import { getAppConfig } from "@/shared/config/appConfig";
import { tCounts, tSportResponse } from "./apiGetSummaryArray";

/** `[eventCount, eventIds]` */
export type SidebarFeaturedMatches = [number, number[]];

/** `[leagueId, name, eventCount, eventIds]` */
export type SidebarFeaturedLeague = [number, string, number, number[]];

/** League under a region — same tuple shape as featured league rows. */
export type SidebarLeagueRow = [number, string, number, number[]];

/** `[regionId, regionName, regionEventCount, leagues]` */
export type SidebarRegionRow = [number, string, number, SidebarLeagueRow[]];

/** `[sportId, sportName, sportEventCount, regions]` */
export type SidebarSportRow = [number, string, number, SidebarRegionRow[]];

/** `[featuredMatches, featuredLeagues, ...sports]` */
export type SidebarArr = [
  SidebarFeaturedMatches,
  SidebarFeaturedLeague[],
  ...SidebarSportRow[],
];

type tProps = {
  status: number[];
  tradingStatus: number;
  isOutright: boolean;
  isBetBuilderSuported?: boolean;
};

/** Strip count fields and map sidebar sports tuples to `tSportResponse`. */
export function sidebarSportsToSportResponse(
  sports: SidebarSportRow[],
): tSportResponse {
  return sports.map(([sportId, sportName, , regions]) => [
    sportId,
    sportName,
    regions.map(([regionId, regionName, , leagues]) => [
      regionId,
      regionName,
      leagues.map(([leagueId, leagueName, , eventIds]) => [
        leagueId,
        leagueName,
        eventIds,
      ]),
    ]),
  ]);
}

function buildCountsFromSportResponse(resData: tSportResponse): tCounts {
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
  return counts;
}

export const apiGetSidebar = async ({
  status = [1],
  tradingStatus = 0,
  isOutright = false,
  isBetBuilderSuported,
}: tProps): Promise<summaryData> => {
  const params = new URLSearchParams();
  params.append("status", status.join(","));
  params.append("tradingStatus", tradingStatus.toString());
  params.append("isOutright", isOutright.toString());
  params.append("lang", getAppConfig().lang);
  if (isBetBuilderSuported) {
    params.append("isBetBuilderSuported", isBetBuilderSuported.toString());
  }

  const response = await instanceOdds88.get<{ data: SidebarArr }>(
    `/sidebar?${params.toString()}`,
  );
  console.log("sidebar response", response.data);
  const arr = response.data.data;
  const sportsRaw = arr.slice(2) as SidebarSportRow[];
  const resData = sidebarSportsToSportResponse(sportsRaw);
  const counts = buildCountsFromSportResponse(resData);

  return {
    data: resData,
    counts,
    TotalCount: Object.values(counts).reduce(
      (acc, curr) => acc + curr.total,
      0,
    ),
  };
};
