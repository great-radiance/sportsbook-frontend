import tierByLeagueIdJson from "@/data/soccerLeagueTierById.json";
import type { LeagueBucketIds, SummaryEventRef } from "./summaryIds";
import { leagueBucketKey } from "./summaryIds";

/** Lower number = higher display priority (tier 0 = international comps). */
export type SoccerLeagueTier = 0 | 1 | 2 | 3 | 4 | 99;

export const SOCCER_TIER_DEFAULT: SoccerLeagueTier = 99;

export type LeagueSortKey = LeagueBucketIds & {
  matchCount?: number;
};

const tierByLeagueId = tierByLeagueIdJson as Record<string, number>;

export function isSoccerSport(_sportName?: string | null, sportId?: number | null): boolean {
  return sportId === 1;
}

export function getSoccerLeagueTier(leagueId: number): SoccerLeagueTier {
  const fromId = tierByLeagueId[String(leagueId)];
  if (fromId != null) return fromId as SoccerLeagueTier;
  return SOCCER_TIER_DEFAULT;
}

export function getSoccerLeagueTierForBucket(item: LeagueSortKey): SoccerLeagueTier {
  return getSoccerLeagueTier(item.leagueId);
}

function tierHasActiveMatches(
  entries: LeagueSortKey[],
  tier: SoccerLeagueTier,
): boolean {
  return entries.some(
    (e) => getSoccerLeagueTierForBucket(e) === tier && (e.matchCount ?? 0) > 0,
  );
}

/** Dynamic promotion: if tier 1 has no fixtures, tier 2 sorts as tier 1, etc. */
export function getEffectiveSoccerTier(
  item: LeagueSortKey,
  allEntries: LeagueSortKey[],
): number {
  const base = getSoccerLeagueTierForBucket(item);
  const tier1Active = tierHasActiveMatches(allEntries, 1);
  const tier2Active = tierHasActiveMatches(allEntries, 2);

  let effective = base;
  if (!tier1Active && base === 2) effective = 1;
  if (!tier1Active && !tier2Active && base === 3) effective = 2;
  return effective;
}

export function compareSoccerLeagues(
  a: LeagueSortKey,
  b: LeagueSortKey,
  allEntries: LeagueSortKey[],
): number {
  const tierA = getEffectiveSoccerTier(a, allEntries);
  const tierB = getEffectiveSoccerTier(b, allEntries);
  if (tierA !== tierB) return tierA - tierB;

  const countDiff = (b.matchCount ?? 0) - (a.matchCount ?? 0);
  if (countDiff !== 0) return countDiff;

  const regionDiff = a.regionId - b.regionId;
  if (regionDiff !== 0) return regionDiff;
  return a.leagueId - b.leagueId;
}

export function sortSoccerLeagues<T extends LeagueSortKey>(entries: T[]): T[] {
  if (entries.length <= 1) return [...entries];
  return [...entries].sort((a, b) => compareSoccerLeagues(a, b, entries));
}

export function sortSoccerFlatMatches(items: SummaryEventRef[]): SummaryEventRef[] {
  if (items.length <= 1) return [...items];

  const leagueBuckets = new Map<
    string,
    { key: LeagueSortKey; items: SummaryEventRef[] }
  >();

  for (const item of items) {
    const bucketKey = leagueBucketKey(item);
    let bucket = leagueBuckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        key: {
          sportId: item.sportId,
          regionId: item.regionId,
          leagueId: item.leagueId,
          matchCount: 0,
        },
        items: [],
      };
      leagueBuckets.set(bucketKey, bucket);
    }
    bucket.items.push(item);
    bucket.key.matchCount = (bucket.key.matchCount ?? 0) + 1;
  }

  const leagueOrder = sortSoccerLeagues(
    [...leagueBuckets.values()].map((b) => b.key),
  ).map((k) => leagueBucketKey(k));

  const orderIndex = new Map(leagueOrder.map((k, i) => [k, i]));
  return [...items].sort((a, b) => {
    const orderDiff =
      (orderIndex.get(leagueBucketKey(a)) ?? 9999) -
      (orderIndex.get(leagueBucketKey(b)) ?? 9999);
    if (orderDiff !== 0) return orderDiff;
    return a.eventId - b.eventId;
  });
}
