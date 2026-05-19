import type {
  SidebarFeaturedLeagueRow,
  SidebarFeaturedMatches,
  SidebarMarketsRef,
  summaryData,
} from "@/state/summarySports";
import { instance } from "../instance";
import { getAppConfig } from "@/shared/config/appConfig";
import { tCounts, tSportResponse } from "./apiGetSummaryArray";

/** League tuple — `[leagueId, name, eventCount, eventIds[], regionId?, sportId?]`. */
export type SidebarLeagueRow = [
  number,
  string,
  number,
  number[],
  number?,
  number?,
];

/** `[regionId, regionName, regionEventCount, leagues]` */
export type SidebarRegionRow = [number, string, number, SidebarLeagueRow[]];

/**
 * Sport row: `[sportId, name, eventCount, famousLeagues[], regions[]]`.
 * Legacy: `[sportId, name, eventCount, regions[]]` (regions at index 3).
 */
export type SidebarSportRow =
  | [number, string, number, SidebarFeaturedLeagueRow[], SidebarRegionRow[]]
  | [number, string, number, SidebarRegionRow[]];

type SidebarApiBody = {
  data: SidebarArr;
  marketsRef?: SidebarMarketsRef;
  cached?: boolean;
  ms?: number;
};

/** `[featuredMatches, featuredLeagues, ...sports]` */
export type SidebarArr = [
  SidebarFeaturedMatches,
  SidebarFeaturedLeagueRow[],
  ...SidebarSportRow[],
];

type tProps = {
  status: number[];
  tradingStatus: number;
  isOutright: boolean;
  isBetBuilderSupported?: boolean;
};

function regionsFromSportRow(sport: SidebarSportRow): SidebarRegionRow[] {
  const s = sport as readonly unknown[];
  if (s.length >= 5 && Array.isArray(s[4])) {
    return s[4] as SidebarRegionRow[];
  }
  if (s.length === 4 && Array.isArray(s[3])) {
    return s[3] as SidebarRegionRow[];
  }
  return [];
}

function famousLeaguesFromSportRow(
  sport: SidebarSportRow,
): SidebarFeaturedLeagueRow[] {
  const s = sport as readonly unknown[];
  if (s.length >= 5 && Array.isArray(s[3]) && Array.isArray(s[4])) {
    return s[3] as SidebarFeaturedLeagueRow[];
  }
  return [];
}

/** Strip count / reserved slots and map sidebar sports tuples to `tSportResponse`. */
export function convertResponse(sports: SidebarSportRow[]): tSportResponse {
  return sports.map((sport) => {
    const sportId = sport[0] as number;
    const sportName = sport[1] as string;
    const regions = regionsFromSportRow(sport);
    return [
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
    ];
  });
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

  const response = await instance.get<SidebarApiBody>(
    `/sidebar?${params.toString()}`,
  );
  const arr = response.data.data;
  const marketsRef = response.data.marketsRef ?? {};
  const sportsRaw = arr.slice(2) as SidebarSportRow[];
  const resData = convertResponse(sportsRaw);
  const counts = buildCountsFromSportResponse(resData);
  const fm = arr[0];
  const featuredMatches: SidebarFeaturedMatches | undefined =
    Array.isArray(fm) &&
    fm.length >= 2 &&
    typeof fm[0] === "number" &&
    Array.isArray(fm[1])
      ? [fm[0], fm[1] as number[]]
      : undefined;
  const featuredLeagues = Array.isArray(arr[1])
    ? (arr[1] as SidebarFeaturedLeagueRow[])
    : [];

  const featuredLeaguesBySport: Record<number, SidebarFeaturedLeagueRow[]> = {};
  for (const sport of sportsRaw) {
    const sportId = sport[0] as number;
    const famous = famousLeaguesFromSportRow(sport);
    if (famous.length) {
      featuredLeaguesBySport[sportId] = famous;
    }
  }

  return {
    data: resData,
    counts,
    TotalCount: (Object.values(counts) as { total: number }[]).reduce(
      (acc, curr) => acc + curr.total,
      0,
    ),
    featuredMatches,
    featuredLeagues,
    featuredLeaguesBySport,
    marketsRef,
  };
};

/**
 * Prematch and live `/sidebar` responses both repeat the same tuple prefix
 * (`featuredMatches`, `featuredLeagues`). After the parallel fetches, copy
 * those fields from prematch onto live/outright so consumers read one source
 * of truth (and we can later strip duplicate parsing if the API adds flags).
 */
export function withPrematchSidebarFeatured(
  prematch: summaryData,
  other: summaryData,
): summaryData {
  return {
    ...other,
    featuredMatches: prematch.featuredMatches ?? other.featuredMatches,
    featuredLeagues: prematch.featuredLeagues ?? other.featuredLeagues,
    marketsRef: prematch.marketsRef ?? other.marketsRef,
  };
}
