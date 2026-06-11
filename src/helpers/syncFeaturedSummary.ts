// import type { PopularSportBucket } from "@/helpers/buildPopularMatchesFromSidebar";
// import {
//   buildPopularSportBuckets,
// } from "@/helpers/buildPopularMatchesFromSidebar";
// import { POPULAR_SPORT_ID, type SummaryEventRef } from "@/helpers/summaryIds";
// import type {
//   FeaturedSummaryData,
//   SidebarFeaturedLeagueRow,
//   SidebarFeaturedMatches,
//   SidebarFetchedSummary,
//   SidebarMarketsRef,
//   summaryData,
// } from "@/state/summarySports";
// import {
//   featuredSummaryData,
//   marketsRef,
// } from "@/state/summarySports";
// import { featuredSportBuckets } from "@/state/featuredMatchesState";

// function leagueKey(row: SidebarFeaturedLeagueRow): string {
//   return `${row[5]}:${row[0]}`;
// }

// function mergeLeagueRows(
//   a: SidebarFeaturedLeagueRow,
//   b: SidebarFeaturedLeagueRow,
// ): SidebarFeaturedLeagueRow {
//   const ids = [...new Set([...(a[3] ?? []), ...(b[3] ?? [])])];
//   return [a[0], a[1] ?? b[1], ids.length, ids, a[4], a[5]];
// }

// function leagueRowsFromFetched(
//   fetched: SidebarFetchedSummary,
// ): SidebarFeaturedLeagueRow[] {
//   const byKey = new Map<string, SidebarFeaturedLeagueRow>();
//   const add = (row: SidebarFeaturedLeagueRow) => {
//     if (!row?.[3]?.length) return;
//     const key = leagueKey(row);
//     const existing = byKey.get(key);
//     byKey.set(key, existing ? mergeLeagueRows(existing, row) : row);
//   };
//   for (const row of fetched.featuredLeagues ?? []) add(row);
//   for (const rows of Object.values(fetched.featuredLeaguesBySport ?? {})) {
//     for (const row of rows) add(row);
//   }
//   return [...byKey.values()];
// }

// function rowToEventRefs(row: SidebarFeaturedLeagueRow): SummaryEventRef[] {
//   return (row[3] ?? []).map((eventId) => ({
//     eventId,
//     sportId: row[5],
//     regionId: row[4],
//     leagueId: row[0],
//   }));
// }

// function appendUniqueIds(target: number[], seen: Set<number>, ids: number[]) {
//   for (const id of ids) {
//     if (seen.has(id)) continue;
//     seen.add(id);
//     target.push(id);
//   }
// }

// function buildRefLookup(
//   ...sources: SidebarFetchedSummary[]
// ): Map<number, SummaryEventRef> {
//   const map = new Map<number, SummaryEventRef>();
//   for (const src of sources) {
//     for (const row of leagueRowsFromFetched(src)) {
//       for (const ref of rowToEventRefs(row)) {
//         map.set(ref.eventId, ref);
//       }
//     }
//   }
//   return map;
// }

// export function buildFeaturedSummaryData(
//   live: SidebarFetchedSummary,
//   prematch: SidebarFetchedSummary,
//   outright: SidebarFetchedSummary,
// ): FeaturedSummaryData {
//   const orderedIds: number[] = [];
//   const seen = new Set<number>();

//   appendUniqueIds(orderedIds, seen, live.featuredMatches?.[1] ?? []);
//   appendUniqueIds(orderedIds, seen, prematch.featuredMatches?.[1] ?? []);
//   appendUniqueIds(orderedIds, seen, outright.featuredMatches?.[1] ?? []);

//   const liveLeagueRows = leagueRowsFromFetched(live);
//   const prematchLeagueRows = leagueRowsFromFetched(prematch);
//   const outrightLeagueRows = leagueRowsFromFetched(outright);

//   for (const row of liveLeagueRows) {
//     appendUniqueIds(orderedIds, seen, row[3] ?? []);
//   }
//   for (const row of prematchLeagueRows) {
//     appendUniqueIds(orderedIds, seen, row[3] ?? []);
//   }
//   for (const row of outrightLeagueRows) {
//     appendUniqueIds(orderedIds, seen, row[3] ?? []);
//   }

//   const refLookup = buildRefLookup(live, prematch, outright);
//   const featuredEventRefs: SummaryEventRef[] = orderedIds.map((eventId) => {
//     const fromLeague = refLookup.get(eventId);
//     if (fromLeague) return fromLeague;
//     return {
//       eventId,
//       sportId: POPULAR_SPORT_ID,
//       regionId: 0,
//       leagueId: 0,
//     };
//   });

//   const featuredMatches: SidebarFeaturedMatches = [
//     orderedIds.length,
//     orderedIds,
//   ];

//   const featuredLeagues = mergeGlobalFeaturedLeagues(
//     live.featuredLeagues,
//     prematch.featuredLeagues,
//     outright.featuredLeagues,
//   );

//   const featuredLeaguesBySport = mergeFeaturedLeaguesBySport(
//     live.featuredLeaguesBySport,
//     prematch.featuredLeaguesBySport,
//     outright.featuredLeaguesBySport,
//   );

//   return {
//     featuredMatches,
//     featuredEventRefs,
//     featuredLeagues,
//     featuredLeaguesBySport,
//   };
// }

// function mergeGlobalFeaturedLeagues(
//   ...lists: (SidebarFeaturedLeagueRow[] | undefined)[]
// ): SidebarFeaturedLeagueRow[] {
//   const byKey = new Map<string, SidebarFeaturedLeagueRow>();
//   for (const list of lists) {
//     for (const row of list ?? []) {
//       if (!row?.[3]?.length) continue;
//       const key = leagueKey(row);
//       const existing = byKey.get(key);
//       byKey.set(key, existing ? mergeLeagueRows(existing, row) : row);
//     }
//   }
//   return [...byKey.values()];
// }

// function mergeFeaturedLeaguesBySport(
//   ...records: (Record<number, SidebarFeaturedLeagueRow[]> | undefined)[]
// ): Record<number, SidebarFeaturedLeagueRow[]> {
//   const out: Record<number, SidebarFeaturedLeagueRow[]> = {};
//   for (const record of records) {
//     for (const [sportIdRaw, rows] of Object.entries(record ?? {})) {
//       const sportId = Number(sportIdRaw);
//       out[sportId] ??= [];
//       const byKey = new Map<string, SidebarFeaturedLeagueRow>();
//       for (const row of out[sportId]) {
//         byKey.set(leagueKey(row), row);
//       }
//       for (const row of rows) {
//         if (!row?.[3]?.length) continue;
//         const key = leagueKey(row);
//         const existing = byKey.get(key);
//         byKey.set(key, existing ? mergeLeagueRows(existing, row) : row);
//       }
//       out[sportId] = [...byKey.values()];
//     }
//   }
//   return out;
// }

// export function mergeMarketsRef(
//   ...sources: (SidebarMarketsRef | undefined)[]
// ): SidebarMarketsRef {
//   const merged: SidebarMarketsRef = {};
//   for (const src of sources) {
//     for (const [sportId, refs] of Object.entries(src ?? {})) {
//       const existing = merged[sportId] ?? [];
//       const byId = new Map(existing.map((r) => [r.id, r]));
//       for (const ref of refs) {
//         byId.set(ref.id, ref);
//       }
//       merged[sportId] = [...byId.values()];
//     }
//   }
//   return merged;
// }

// export function popularTabEventRefsFromFeatured(
//   featured: FeaturedSummaryData,
// ) {
//   return featured.featuredEventRefs;
// }

// export function toSummaryTree(fetched: SidebarFetchedSummary): summaryData {
//   return {
//     data: fetched.data,
//     counts: fetched.counts,
//     TotalCount: fetched.TotalCount,
//   };
// }

// /** Assign tree signals + consolidated `featuredSummaryData` / `marketsRef`. */
// export function syncFeaturedFromSidebars(
//   prematch: SidebarFetchedSummary,
//   live: SidebarFetchedSummary,
//   outright: SidebarFetchedSummary,
// ): PopularSportBucket[] {
//   featuredSummaryData.value = buildFeaturedSummaryData(
//     live,
//     prematch,
//     outright,
//   );
//   marketsRef.value = mergeMarketsRef(
//     prematch.marketsRef,
//     live.marketsRef,
//     outright.marketsRef,
//   );
//   const buckets = buildPopularSportBuckets(
//     featuredSummaryData.value,
//     prematch,
//     live,
//   );
//   featuredSportBuckets.value = buckets;
//   return buckets;
// }
