/** Stable keys for sport / region / league buckets (names are not used). */
export type LeagueBucketIds = {
  sportId: number;
  regionId: number;
  leagueId: number;
};

export function leagueBucketKey({
  sportId,
  regionId,
  leagueId,
}: LeagueBucketIds): string {
  return `${sportId}:${regionId}:${leagueId}`;
}

/** One event reference in a flattened sidebar list — display data comes from `storeState`. */
export type SummaryEventRef = {
  eventId: number;
  sportId: number;
  regionId: number;
  leagueId: number;
};

export const POPULAR_SPORT_ID = 0;
export const SOCCER_SPORT_ID = 1;

export function isPopularBucket(sportId: number): boolean {
  return sportId === POPULAR_SPORT_ID;
}
