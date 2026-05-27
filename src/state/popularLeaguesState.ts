import { signal } from "@preact/signals";
import type { TopLeagueItem } from "@/helpers/topLeagueItems";

export type { TopLeagueItem };

export const popularLeaguesState = signal<TopLeagueItem[]>([]);
