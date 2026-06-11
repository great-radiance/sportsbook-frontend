export type SearchMatchItem = {
  eventId: number;
  sport: string;
  region: string;
  league: string;
  participants?: string[];
  startDate?: number;
};

export type SearchLeagueItem = {
  sport: string;
  region: string;
  league: string;
};
export type SearchRegionItem = { sport: string; region: string };

export type SearchSummaryResult = {
  matches: SearchMatchItem[];
  leagues: SearchLeagueItem[];
  sports: string[];
  regions: SearchRegionItem[];
};

function eventMatchesQuery(
  q: string,
  sport: string,
  region: string,
  league: string,
  participants?: { name?: string | null }[],
): boolean {
  const lower = q.toLowerCase().trim();
  if (!lower) return false;
  if (sport.toLowerCase().includes(lower)) return true;
  if (region.toLowerCase().includes(lower)) return true;
  if (league.toLowerCase().includes(lower)) return true;
  if (participants?.some((p) => p.name && p.name.toLowerCase().includes(lower)))
    return true;
  return false;
}

/**
 * Search matches, leagues, sports, and regions in summarySports (prematch) and summarySportsLive (live).
 */
export function searchSummarySports(query: string): SearchSummaryResult {
  const q = query.trim();
  const matches: SearchMatchItem[] = [];
  const leaguesSet = new Set<string>();
  const sportsSet = new Set<string>();
  const regionsSet = new Set<string>();

  const addFromData = (
    data: Record<
      string,
      Record<
        string,
        Record<
          string,
          Record<
            number,
            {
              id: number;
              startDate?: number;
              participants?: { name?: string | null }[];
            }
          >
        >
      >
    >,
  ) => {
    for (const sport of Object.keys(data)) {
      const byRegion = data[sport] || {};
      for (const region of Object.keys(byRegion)) {
        const byLeague = byRegion[region] || {};
        for (const league of Object.keys(byLeague)) {
          const byEvent = byLeague[league] || {};
          for (const eventIdStr of Object.keys(byEvent)) {
            const eventId = Number(eventIdStr);
            const eventData = byEvent[eventId];
            const participants = eventData?.participants;
            if (eventMatchesQuery(q, sport, region, league, participants)) {
              matches.push({
                eventId,
                sport,
                region,
                league,
                participants: participants?.map((p) => p.name || ""),
                startDate: eventData?.startDate,
              });
              leaguesSet.add(`${sport}\0${region}\0${league}`);
              sportsSet.add(sport);
              regionsSet.add(`${sport}\0${region}`);
            }
          }
        }
      }
    }
  };

  // addFromData(summarySports.value.data as any);
  // addFromData(summarySportsLive.value.data as any);

  const leagues: SearchLeagueItem[] = Array.from(leaguesSet).map((key) => {
    const [sport, region, league] = key.split("\0");
    return { sport, region, league };
  });
  const sports = Array.from(sportsSet);
  const regions: SearchRegionItem[] = Array.from(regionsSet).map((key) => {
    const [sport, region] = key.split("\0");
    return { sport, region };
  });

  return { matches, leagues, sports, regions };
}
