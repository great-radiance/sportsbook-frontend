import { signal } from "@preact/signals";
import { tCounts, tSportResponse } from "@/api/sidebar/apiGetSummaryArray";

/** Row at index `[0]` in `/sidebar` response — `[eventCount, eventIds]`. */
export type SidebarFeaturedMatches = [number, number[]];

/** Row at index `[1]` in `/sidebar` response — `[leagueId, name, eventCount, eventIds]`. */
export type SidebarFeaturedLeagueRow = [number, string, number, number[]];

// interface GroupedData {
//   [sportId: number]: {
//     [competitionId: number]: BoostedOddsEvent[];
//   };
// }
export type summaryData = {
  data: tSportResponse;
  counts: tCounts;
  TotalCount: number;
  /** From `/sidebar` tuple index `[0]` (curated popular event ids, server order). */
  featuredMatches?: SidebarFeaturedMatches;
  /** From `/sidebar` tuple index `[1]` (favorite / popular leagues). */
  featuredLeagues?: SidebarFeaturedLeagueRow[];
};

export const summarySports = signal<summaryData>({
  data: [],
  counts: {},
  TotalCount: 0,
});

export const summarySportsLive = signal<summaryData>({
  data: [],
  counts: {},
  TotalCount: 0,
});

export const outRightSummarySports = signal<summaryData>({
  data: [],
  counts: {},
  TotalCount: 0,
});

export const liveCount = signal<number>(0);
export const prematchCount = signal<number>(0);
// export const testData = signal<GroupedData>({});
export const stateScoreBoardId = signal<string>("");
