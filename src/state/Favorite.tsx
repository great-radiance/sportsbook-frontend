import { tEvent } from "@/types/tEvent";
import { tMarket } from "@/types/tMarket";
import { signal } from "@preact/signals";

export const favoriteMatches = signal<tEvent[]>([]);

export const favoriteMarkets = signal<tMarket[]>([]);
