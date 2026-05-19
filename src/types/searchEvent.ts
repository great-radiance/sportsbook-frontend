/** Normalized row for the search UI (`GET /events/search`). */
export type SearchEventRow = {
  eventId: number;
  sportName: string;
  sportId: number;
  regionName: string;
  regionId: number;
  leagueName: string;
  leagueId: number;
  participants: [string, string];
  startTime: number;
  markets: { name: string }[];
};
