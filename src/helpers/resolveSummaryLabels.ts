import type { tSportResponse } from "@/api/sidebar/apiGetSummaryArray";

type RegionTuple = tSportResponse[2][number];

export type LeagueLabel = {
  regionName: string;
  leagueName: string;
};

/** Resolve display names from sidebar summary tuples (for UI only). */
export function resolveLeagueLabel(
  sportRegions: RegionTuple[],
  regionId: number,
  leagueId: number,
): LeagueLabel | null {
  const region = sportRegions.find((r) => r[0] === regionId);
  if (!region) return null;
  const league = (region[2] ?? []).find((l) => l[0] === leagueId);
  if (!league) return null;
  return { regionName: String(region[1] ?? ""), leagueName: String(league[1] ?? "") };
}

export function buildLeagueLabelMap(
  sportRegions: readonly RegionTuple[],
): Map<string, LeagueLabel> {
  const map = new Map<string, LeagueLabel>();
  for (const region of sportRegions) {
    const regionId = region[0];
    const regionName = String(region[1] ?? "");
    for (const league of region[2] ?? []) {
      const leagueId = league[0];
      map.set(`${regionId}:${leagueId}`, {
        regionName,
        leagueName: String(league[1] ?? ""),
      });
    }
  }
  return map;
}
