import { signal } from "@preact/signals";
import { tMarket } from "@/types/tMarket";

export const prematchMarkets = signal<Record<string, tMarket>>({} as unknown as Record<string, tMarket>);
