import { FeaturedLeague } from "@/api/special-matches/apiGetFeaturedLeagues";
import { signal } from "@preact/signals";

export const popularLeaguesState = signal<FeaturedLeague>({});
