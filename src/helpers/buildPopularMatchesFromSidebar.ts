import type {
  FeaturedSummaryData,
  SidebarFeaturedLeagueRow,
  summaryData,
} from "@/state/summarySports";
import { type SummaryEventRef } from "@/helpers/summaryIds";
import { isEventValidForDisplay } from "@/helpers/sortEventIdsByStartDate";

export type PopularSportBucket = {
  sportId: number;
  sportName: string;
  eventRefs: SummaryEventRef[];
};

function leagueKey(row: SidebarFeaturedLeagueRow): string {
  return `${row[5]}:${row[0]}`;
}

function mergeLeagueRows(
  a: SidebarFeaturedLeagueRow,
  b: SidebarFeaturedLeagueRow,
): SidebarFeaturedLeagueRow {
  const ids = [...new Set([...(a[3] ?? []), ...(b[3] ?? [])])];
  return [a[0], a[1] ?? b[1], ids.length, ids, a[4], a[5]];
}

function rowToEventRefs(row: SidebarFeaturedLeagueRow): SummaryEventRef[] {
  const leagueId = row[0];
  const regionId = row[4];
  const sportId = row[5];
  return (row[3] ?? []).map((eventId) => ({
    eventId,
    sportId,
    regionId,
    leagueId,
  }));
}

function resolveSportName(
  summary: summaryData,
  sportId: number,
): string {
  const fromTree = summary.data?.find((s) => s[0] === sportId)?.[1];
  return String(fromTree ?? "").trim() || `Sport ${sportId}`;
}

function leagueRowsFromFeatured(
  featured: FeaturedSummaryData,
): SidebarFeaturedLeagueRow[] {
  const byKey = new Map<string, SidebarFeaturedLeagueRow>();

  const add = (row: SidebarFeaturedLeagueRow) => {
    if (!row?.[3]?.length) return;
    const key = leagueKey(row);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeLeagueRows(existing, row) : row);
  };

  for (const row of featured.featuredLeagues) add(row);
  for (const rows of Object.values(featured.featuredLeaguesBySport)) {
    for (const row of rows) add(row);
  }

  return [...byKey.values()];
}

/**
 * Per-sport buckets from consolidated featured leagues (Top Matches sport tabs).
 */
export function buildPopularSportBuckets(
  featured: FeaturedSummaryData,
  prematch: summaryData,
  live: summaryData,
): PopularSportBucket[] {
  const bySport = new Map<
    number,
    { sportName: string; refs: Map<number, SummaryEventRef> }
  >();

  for (const row of leagueRowsFromFeatured(featured)) {
    const sportId = row[5];
    if (!bySport.has(sportId)) {
      const name =
        resolveSportName(prematch, sportId) ||
        resolveSportName(live, sportId);
      bySport.set(sportId, { sportName: name, refs: new Map() });
    }
    const bucket = bySport.get(sportId)!;
    for (const ref of rowToEventRefs(row)) {
      bucket.refs.set(ref.eventId, ref);
    }
  }

  return [...bySport.entries()]
    .map(([sportId, { sportName, refs }]) => ({
      sportId,
      sportName,
      eventRefs: [...refs.values()],
    }))
    .filter((b) => b.eventRefs.length > 0)
    .sort((a, b) => a.sportName.localeCompare(b.sportName));
}

export function allEventIdsFromBuckets(
  buckets: PopularSportBucket[],
): number[] {
  const ids = new Set<number>();
  for (const bucket of buckets) {
    for (const ref of bucket.eventRefs) {
      ids.add(ref.eventId);
    }
  }
  return [...ids];
}

/** Legacy shape for Banner carousel — region/league keys are numeric ids. */
export function bucketsToPopularMatchesState(
  buckets: PopularSportBucket[],
): Record<string, Record<string, Record<string, number[]>>> {
  const tree: Record<string, Record<string, Record<string, number[]>>> = {};
  for (const bucket of buckets) {
    for (const ref of bucket.eventRefs) {
      const sk = String(ref.sportId);
      const rk = String(ref.regionId);
      const lk = String(ref.leagueId);
      tree[sk] ??= {};
      tree[sk][rk] ??= {};
      tree[sk][rk][lk] ??= [];
      if (!tree[sk][rk][lk].includes(ref.eventId)) {
        tree[sk][rk][lk].push(ref.eventId);
      }
    }
  }
  return tree;
}

export function isDisplayablePopularEvent(event?: {
  startTime?: string;
  status?: string | number;
}): boolean {
  if (!event) return false;
  if (event.status === 3) return true;
  return isEventValidForDisplay(
    event as { startTime: string; status?: string | number },
  );
}
