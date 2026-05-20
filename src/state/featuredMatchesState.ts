import { signal } from "@preact/signals";
import type { PopularSportBucket } from "@/helpers/buildPopularMatchesFromSidebar";
import { popularTabEventRefsFromFeatured } from "@/helpers/syncFeaturedSummary";
import { featuredSummaryData } from "@/state/summarySports";

export type { PopularSportBucket };

/** Per-sport featured-league buckets for Top Matches. */
export const featuredSportBuckets = signal<PopularSportBucket[]>([]);

export { syncFeaturedFromSidebars } from "@/helpers/syncFeaturedSummary";

export function featuredBucketForSport(
  sportId: number,
): PopularSportBucket | undefined {
  return featuredSportBuckets.value.find((b) => b.sportId === sportId);
}

export function popularTabEventRefs() {
  return popularTabEventRefsFromFeatured(featuredSummaryData.value);
}

export function hasPopularTabEvents(): boolean {
  return popularTabEventRefs().length > 0;
}
