import { apiGetMatches } from "@/api/matches/apiGetMatches";
import { storeEvent } from "@/helpers/storeEvent";
import { storeState } from "@/state/storeState";

/** Fetches and stores events that are missing or have no markets in `storeState`. */
export async function ensureEventsInStore(eventIds: number[]): Promise<void> {
  const unique = [...new Set(eventIds)].filter(
    (id) => Number.isFinite(id) && id > 0,
  );
  const missing = unique.filter((id) => {
    const ev = storeState.value[id]?.value;
    return !ev?.markets || Object.keys(ev.markets).length === 0;
  });
  if (missing.length === 0) return;
  const events = await apiGetMatches(missing);
  (events ?? []).forEach((event) => storeEvent(event));
}
