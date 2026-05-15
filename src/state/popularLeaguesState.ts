import { signal } from "@preact/signals";
import type { FeaturedLeague } from "@/state/featuredLeaguesTypes";

export type { FeaturedLeague };

export const popularLeaguesState = signal<FeaturedLeague>({});
