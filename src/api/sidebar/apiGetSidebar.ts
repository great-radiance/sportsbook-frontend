import { instance } from "../instance";

export type MarketInfoType = {
  type: string;
  candidates: number[];
  translations: Record<string, string>;
};
export type NodeType =
  | "featured_leagues"
  | "sport"
  | "custom_region"
  | "region"
  | "combined_region"
  | "league"
  | "combined_league"
  | "combined_sport";

export type sidebarNode = {
  id: string;
  order: number;
  translations: Record<string, string>;
  type: NodeType;
  children?: sidebarNode[];
  sportId?: number;
  leagueId?: number;
  leagueIds?: number[];
  regionId?: number;
  regionIds?: number[];
  region?: {
    id: number;
    translations: Record<string, string>;
  };
  // events?: number[];
  // bbEvents?: number[];
  pre?: number[];
  live?: number[];
  outright?: number[];
  bbPre?: number[];
  bbLive?: number[];
  markets?: MarketInfoType[];
};

export type countsBySport = Record<number, number>;

export type SidebarApiBody = sidebarNode[];
export type countsSummary = {
  preMatchCount: {
    counts: countsBySport;
    totalCount: number;
  };
  liveCount: {
    counts: countsBySport;
    totalCount: number;
  };
  outrightCount: {
    counts: countsBySport;
    totalCount: number;
  };
};

const COMBINED_SPORT_ID = 0;

const deleteZeroCount = (counts: countsBySport, sportId: number) => {
  if (counts[sportId] === 0) delete counts[sportId];
};

export const apiGetSidebar = async () => {
  const response = await instance.get<{ config: sidebarNode[] }>(
    "/users/sidebar",
  );

  const featuredLeagues = [] as sidebarNode[];

  const countsSummary: countsSummary = {
    preMatchCount: {
      counts: {} as countsBySport,
      totalCount: 0,
    },
    liveCount: {
      counts: {} as countsBySport,
      totalCount: 0,
    },
    outrightCount: {
      counts: {} as countsBySport,
      totalCount: 0,
    },
  };

  const buildCounts = (node: sidebarNode, sportId: number) => {
    if (node.type === "league" || node.type === "combined_league") {
      const pre = node.pre?.length ?? 0;
      const live = node.live?.length ?? 0;
      const outright = node.outright?.length ?? 0;

      countsSummary.preMatchCount.counts[sportId] =
        (countsSummary.preMatchCount.counts[sportId] ?? 0) + pre;
      countsSummary.preMatchCount.totalCount += pre;
      countsSummary.liveCount.counts[sportId] =
        (countsSummary.liveCount.counts[sportId] ?? 0) + live;
      countsSummary.liveCount.totalCount += live;
      countsSummary.outrightCount.counts[sportId] =
        (countsSummary.outrightCount.counts[sportId] ?? 0) + outright;
      countsSummary.outrightCount.totalCount += outright;
    } else {
      for (const child of node.children ?? []) {
        buildCounts(child, sportId);
      }
    }
  };

  for (const node of response.data.config ?? []) {
    if (node.type === "featured_leagues") {
      featuredLeagues.push(...(node.children ?? []));
    } else if (node.type === "sport") {
      const sportId = node.sportId ?? 0;
      countsSummary.preMatchCount.counts[sportId] = 0;
      countsSummary.liveCount.counts[sportId] = 0;
      countsSummary.outrightCount.counts[sportId] = 0;
      for (const sportChild of node.children ?? []) {
        buildCounts(sportChild, sportId);
      }
      // deleteZeroCount(countsSummary.preMatchCount.counts, sportId);
      // deleteZeroCount(countsSummary.liveCount.counts, sportId);
      // deleteZeroCount(countsSummary.outrightCount.counts, sportId);
    } else if (node.type === "combined_sport") {
      countsSummary.preMatchCount.counts[COMBINED_SPORT_ID] = 0;
      countsSummary.liveCount.counts[COMBINED_SPORT_ID] = 0;
      countsSummary.outrightCount.counts[COMBINED_SPORT_ID] = 0;
      for (const combinedSportChild of node.children ?? []) {
        buildCounts(combinedSportChild, COMBINED_SPORT_ID);
      }
      // deleteZeroCount(countsSummary.preMatchCount.counts, COMBINED_SPORT_ID);
      // deleteZeroCount(countsSummary.liveCount.counts, COMBINED_SPORT_ID);
      // deleteZeroCount(countsSummary.outrightCount.counts, COMBINED_SPORT_ID);
    }
  }
  return {
    data: response.data.config,
    countsSummary: countsSummary,
    featuredLeagues: featuredLeagues,
  };
};
