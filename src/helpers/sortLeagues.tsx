import { isSoccerSport, sortSoccerLeagues } from "./soccerLeagueTiers";

type LeagueItem = {
  key: string;
  sportId: number;
  regionId: number;
  leagueId: number;
  /** Display only — resolved from summary; not used for sorting. */
  region?: string;
  league?: string;
  eventIds: number[];
  outrightIds: number[];
  matchCount: number;
};

type TopLeague = {
  league: string;
  region: string;
};

type TopLeaguesMap = {
  [sport: string]: TopLeague[];
};

const topLeaguesMap: TopLeaguesMap = {
  global: [
    { league: "Premier League", region: "England" },
    { league: "Champions League", region: "Europe" },
    { league: "La Liga", region: "Spain" },
    { league: "Serie A", region: "Italy" },
    { league: "Bundesliga", region: "Germany" },
    { league: "Ligue 1", region: "France" },
    { league: "Europa League", region: "Europe" },
    { league: "World Cup", region: "International" },
    { league: "NBA", region: "USA" },
    { league: "EuroLeague", region: "Europe" },
    { league: "ATP", region: "International" },
    { league: "WTA", region: "International" },
  ],

  soccer: [
    // 🌍 International
    { league: "World Cup", region: "International" },
    { league: "Euro", region: "Europe" },
    { league: "Copa America", region: "South America" },
    { league: "Africa Cup of Nations", region: "Africa" },

    // 🇪🇺 Europe top
    { league: "Champions League", region: "Europe" },
    { league: "Europa League", region: "Europe" },
    { league: "Conference League", region: "Europe" },

    // 🇬🇧 England
    { league: "Premier League", region: "England" },
    // { league: "FA Cup", region: "England" },
    // { league: "EFL Cup", region: "England" },

    // 🇪🇸 Spain
    { league: "La Liga", region: "Spain" },
    // { league: "Copa del Rey", region: "Spain" },

    // 🇮🇹 Italy
    { league: "Serie A", region: "Italy" },
    // { league: "Coppa Italia", region: "Italy" },

    // 🇩🇪 Germany
    { league: "Bundesliga", region: "Germany" },
    // { league: "DFB Pokal", region: "Germany" },

    // 🇫🇷 France
    { league: "Ligue 1", region: "France" },

    // 🌍 Africa
    { league: "CAF Champions League", region: "Africa" },

    // 🇺🇸 MLS
    { league: "MLS", region: "USA" },

    // 🇧🇷 Brazil
    { league: "Serie A", region: "Brazil" },

    // 🇦🇷 Argentina
    { league: "Primera Division", region: "Argentina" },
  ],

  basketball: [
    { league: "NBA", region: "USA" },
    { league: "EuroLeague", region: "Europe" },
    { league: "FIBA World Cup", region: "International" },
    { league: "NCAA", region: "USA" },
    { league: "ACB", region: "Spain" },
    { league: "LNB Pro A", region: "France" },
  ],

  tennis: [
    { league: "ATP", region: "International" },
    { league: "WTA", region: "International" },
    { league: "US Open", region: "USA" },
    { league: "Wimbledon", region: "England" },
    { league: "Roland Garros", region: "France" },
    { league: "Australian Open", region: "Australia" },
  ],

  cricket: [
    { league: "IPL", region: "India" },
    { league: "ICC World Cup", region: "International" },
    { league: "Big Bash League", region: "Australia" },
    { league: "PSL", region: "Pakistan" },
  ],

  esports: [
    { league: "LCS", region: "USA" },
    { league: "LEC", region: "Europe" },
    { league: "LCK", region: "South Korea" },
    { league: "The International", region: "International" },
  ],

  americanfootball: [
    { league: "NFL", region: "USA" },
    { league: "Super Bowl", region: "USA" },
    { league: "NCAA", region: "USA" },
  ],

  baseball: [
    { league: "MLB", region: "USA" },
    { league: "World Series", region: "USA" },
    { league: "NPB", region: "Japan" },
  ],

  hockey: [
    { league: "NHL", region: "USA" },
    { league: "KHL", region: "Russia" },
    { league: "IIHF World Championship", region: "International" },
  ],

  mma: [
    { league: "UFC", region: "International" },
    { league: "Bellator", region: "USA" },
  ],
};

export function sortLeagues(
  leagues: LeagueItem[],
  sportName?: string,
  sportId?: number,
): LeagueItem[] {
  if (isSoccerSport(sportName, sportId)) {
    return sortSoccerLeagues(leagues);
  }

  const key = sportName?.toLowerCase() ?? "global";
  const priorityList = topLeaguesMap[key] ?? [];

  const getPriority = (item: LeagueItem) => {
    const leagueName = item.league?.toLowerCase() ?? "";
    const regionName = item.region?.toLowerCase() ?? "";
    if (!leagueName || !regionName) return Infinity;

    const index = priorityList.findIndex(
      (top) =>
        top.league.toLowerCase() === leagueName &&
        top.region.toLowerCase() === regionName,
    );

    return index === -1 ? Infinity : index;
  };

  return [...leagues].sort((a, b) => {
    const aPriority = getPriority(a);
    const bPriority = getPriority(b);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const regionA = a.region ?? "";
    const regionB = b.region ?? "";

    const regionCompare = regionA.localeCompare(regionB);
    if (regionCompare !== 0) return regionCompare;

    return a.league.localeCompare(b.league);
  });
}

type TopLeaguesMap2 = {
  [sport: string]: string[];
};

const topLeaguesMap2: TopLeaguesMap2 = {
  global: [
    "Premier League",
    "Champions League",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "Ligue 1",
    "NBA",
    "ATP",
    "WTA",
  ],
  soccer: [
    "Champions League",
    "Premier League",
    "La Liga",
    "Serie A",
    "Bundesliga",
  ],
  basketball: ["NBA", "EuroLeague"],
};

export function sortLeagueNames(
  leagues: string[],
  sportName?: string,
): string[] {
  const key = sportName?.toLowerCase() ?? "global";
  const priorityList = topLeaguesMap2[key] ?? [];

  const priorityMap = new Map(
    priorityList.map((name, index) => [name.toLowerCase(), index]),
  );

  return [...leagues].sort((a, b) => {
    const aPriority = priorityMap.has(a.toLowerCase())
      ? priorityMap.get(a.toLowerCase())!
      : Infinity;

    const bPriority = priorityMap.has(b.toLowerCase())
      ? priorityMap.get(b.toLowerCase())!
      : Infinity;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // fallback alphabetical
    return a.localeCompare(b);
  });
}
