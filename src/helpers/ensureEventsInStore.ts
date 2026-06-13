// import { apiGetMatches } from "@/api/matches/apiGetMatchesByNode";
import { storeEvent } from "@/helpers/storeEvent";
import { sportsbookStore } from "@/state/sportsbookStoreContext";

const { storeState } = sportsbookStore;
import type { tEventModel } from "@/types/typesForSocket.ts/tEventModel";

export type EnsureEventsInStoreOptions = {
  /** Market type IDs required on each event (passed to `GET /odds88/events/selected`). */
  marketIds?: number[];
};

function eventHasMarketTypes(ev: tEventModel | undefined): boolean {
  if (!ev?.markets || Object.keys(ev.markets).length === 0) return false;
  return true;
}

// /** Fetches and stores events that are missing or lack required markets in `storeState`. */
// export async function ensureEventsInStore(
//   eventIds: number[],
//   options?: EnsureEventsInStoreOptions,
// ): Promise<void> {
//   const unique = [...new Set(eventIds)].filter(
//     (id) => Number.isFinite(id) && id > 0,
//   );
//   const missing = unique.filter(
//     (id) => !eventHasMarketTypes(storeState.value[id]?.value),
//   );
//   if (missing.length === 0) return;
//   const marketIds = [...new Set(options?.marketIds ?? [])].filter(
//     (id) => Number.isFinite(id) && id > 0,
//   );
//   const events = await apiGetMatches(
//     missing,
//     marketIds.length > 0 ? { marketIds } : undefined,
//   );
//   (events ?? []).forEach((event) => storeEvent(event));
// }
