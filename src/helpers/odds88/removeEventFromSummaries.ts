import { storeState } from "@/state/storeState";
import { summarySports, summarySportsLive } from "@/state/summarySports";
import type { tEventModel } from "@/types/typesForSocket.ts/tEventModel";

const TERMINAL_STATUSES = new Set([
  "Finished",
  "finished",
  "PreFinished",
  "Prefinished",
  "Coverage lost",
  "Coverage Lost",
]);

export function isTerminalEventStatus(status: string | number | undefined): boolean {
  if (status == null) return false;
  if (typeof status === "string") return TERMINAL_STATUSES.has(status);
  return status === 3 || status === 4;
}

function removeFromSummaryTree(
  summary: typeof summarySports.value,
  prev: tEventModel,
  eventId: number,
): void {
  const sport = prev.sport?.name;
  const region = prev.region?.name;
  const league = prev.league?.name;
  if (!sport || !region || !league) return;

  const data = summary.data as unknown as Record<
    string,
    Record<string, Record<string, Record<number, unknown>>>
  >;

  if (data[sport]?.[region]?.[league]?.[eventId]) {
    delete data[sport][region][league][eventId];
    const counts = summary.counts as Record<
      string,
      {
        total: number;
        regions?: Record<
          string,
          { total: number; leagues?: Record<string, number> }
        >;
      }
    >;
    const sportCounts = counts[sport];
    if (sportCounts) {
      sportCounts.total -= 1;
      const regionCounts = sportCounts.regions?.[region];
      if (regionCounts) {
        regionCounts.total -= 1;
        const leagues = regionCounts.leagues;
        if (leagues && leagues[league]) {
          leagues[league] -= 1;
        }
      }
    }
  }
}

/** Remove finished / coverage-lost events from sidebar summaries and store. */
export function removeEventFromSummariesAndStore(
  eventId: number,
  prev: tEventModel,
  options?: { keepIfViewingEventId?: number },
): void {
  removeFromSummaryTree(summarySports.value, prev, eventId);
  summarySports.value = { ...summarySports.value };

  removeFromSummaryTree(summarySportsLive.value, prev, eventId);
  summarySportsLive.value = { ...summarySportsLive.value };

  if (options?.keepIfViewingEventId === eventId) {
    return;
  }

  delete storeState.value[eventId];
  storeState.value = { ...storeState.value };
}
