import { sidebarNode } from "@/api/sidebar/apiGetSidebar";
import { buildPrematchPath } from "@/helpers/buildPrematchPath";
import { summarySportsState } from "@/state/summarySports";
import { POPULAR_SPORT_ID } from "./summaryIds";

export type TopLeagueItem = {
  sport: { id: number; name: string };
  region: { id: number; name: string };
  league: { id: number; name: string };
};

const NAMED_SPORT_LIMITS: Record<string, number> = {
  soccer: 8,
  football: 8,
  basketball: 3,
  tennis: 3,
  "ice hockey": 2,
};

/** Shared budget for everything not in `NAMED_SPORT_LIMITS`. */
const OTHER_SPORTS_TOTAL_BUDGET = 4;

function sportKey(sportName: string): string {
  return sportName.trim().toLowerCase();
}

type SportNode = {
  id: number;
  name: string;
  regions: RegionNode[];
  regionById: Map<number, RegionNode>;
  leagueById: Map<number, { regionId: number; name: string }>;
};

type RegionNode = {
  id: number;
  name: string;
  leagues: { id: number; name: string }[];
};

export function buildTopLeagueItems(): TopLeagueItem[] {
  const out: TopLeagueItem[] = [];

  for (const node of summarySportsState.value) {
    if (node.type === "featured_leagues") {
      for (const league of node?.children ?? []) {
        out.push({
          sport: { id: node.sportId. },
          region: { id: l, name: league.name },
          league: { id: league.id, name: league.name },
        });
      }
    }
  }

  return out;
}
