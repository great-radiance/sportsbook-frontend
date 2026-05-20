import { signal } from "@preact/signals";
import { tCounts, tSportResponse } from "@/api/sidebar/apiGetSummaryArray";
import type { SummaryEventRef } from "@/helpers/summaryIds";

/** Row at index `[0]` in `/sidebar` response — `[eventCount, eventIds]`. */
export type SidebarFeaturedMatches = [number, number[]];

/** Row at index `[1]` or famous leagues on a sport — 6-tuple per integration guide. */
export type SidebarFeaturedLeagueRow = [
  number,
  string,
  number,
  number[],
  number,
  number,
];

/** Market type reference from `/sidebar` `marketsRef` keyed by sport id. */
export type SidebarMarketRef = {
  id: number;
  name: string;
  groups: { id: number; name: string; order: number; sportId: number }[];
  isMultilineMarket: boolean;
  isFreeText: boolean;
};

export type SidebarMarketsRef = Record<string, SidebarMarketRef[]>;

/** Sport / region / league tree only (no duplicated featured prefix). */
export type summaryData = {
  data: tSportResponse;
  counts: tCounts;
  TotalCount: number;
};

/** Full `/sidebar` parse result before splitting tree vs featured signals. */
export type SidebarFetchedSummary = summaryData & {
  featuredMatches?: SidebarFeaturedMatches;
  featuredLeagues?: SidebarFeaturedLeagueRow[];
  featuredLeaguesBySport?: Record<number, SidebarFeaturedLeagueRow[]>;
  marketsRef?: SidebarMarketsRef;
};

/**
 * Merged featured data from prematch, live, and outright sidebar responses.
 * `featuredMatches[1]` order: live curated → prematch curated → live leagues → prematch leagues → outright leagues.
 */
export type FeaturedSummaryData = {
  featuredMatches: SidebarFeaturedMatches;
  featuredEventRefs: SummaryEventRef[];
  featuredLeagues: SidebarFeaturedLeagueRow[];
  featuredLeaguesBySport: Record<number, SidebarFeaturedLeagueRow[]>;
};

export const emptyFeaturedSummaryData = (): FeaturedSummaryData => ({
  featuredMatches: [0, []],
  featuredEventRefs: [],
  featuredLeagues: [],
  featuredLeaguesBySport: {},
});

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

export const featuredSummaryData = signal<FeaturedSummaryData>(
  emptyFeaturedSummaryData(),
);

/** Merged `marketsRef` from prematch, live, and outright (later sources override per sport key). */
export const marketsRef = signal<SidebarMarketsRef>({});

export const liveCount = signal<number>(0);
export const prematchCount = signal<number>(0);
export const stateScoreBoardId = signal<string>("");
