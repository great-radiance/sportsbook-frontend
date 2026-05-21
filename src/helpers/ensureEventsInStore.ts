import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";
import type { tEventModel } from "@/types/typesForSocket.ts/tEventModel";

export type EnsureEventsInStoreOptions = {
  /** Market type IDs required on each event (passed to `GET /odds88/events/selected`). */
  marketIds?: number[];
};

function eventHasMarketTypes(
  ev: tEventModel | undefined,
  marketTypeIds: number[],
): boolean {
  if (!ev?.markets || Object.keys(ev.markets).length === 0) return false;
  if (marketTypeIds.length === 0) return true;
  return marketTypeIds.every((mid) =>
    Object.values(ev.markets).some((sig) => sig.value?.id === mid),
  );
}

/** Fetches and stores events that are missing or lack required markets in `storeState`. */
export async function ensureEventsInStore(
  eventIds: number[],
  options?: EnsureEventsInStoreOptions,
): Promise<void> {
  const marketTypeIds = [...new Set(options?.marketIds ?? [])].filter(
    (id) => Number.isFinite(id) && id > 0,
  );
  const unique = [...new Set(eventIds)].filter(
    (id) => Number.isFinite(id) && id > 0,
  );
  const missing = unique.filter(
    (id) => !eventHasMarketTypes(storeState.value[id]?.value, marketTypeIds),
  );
  if (missing.length === 0) return;
  const events = await apiGetMatches(missing, {
    marketIds: marketTypeIds.length > 0 ? marketTypeIds : undefined,
  });
  (events ?? []).forEach((event) => storeEvent(event));
}
