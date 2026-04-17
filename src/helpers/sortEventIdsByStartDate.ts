import { storeState } from "@/state/storeState";

const isEventValidForDisplay = (event?: {
  startDate?: number;
  status?: string;
}) => {
  if (!event || typeof event.startDate !== "number") return false;

  const status = event.status?.toUpperCase() ?? "";
  const isLiveOrSuspended = status === "LIVE" || status === "SUSPENDED";

  // Hide events that are already finished or stale prematch events with a past start time.
  if (status === "ENDED") return false;
  if (event.startDate < Date.now() && !isLiveOrSuspended) return false;

  return true;
};

export const sortEventIdsByStartDate = (ids: number[]) =>
  [...ids]
    .filter((id) => isEventValidForDisplay(storeState.value[id]?.value))
    .sort((a, b) => {
      const aEvent = storeState.value[a]?.value;
      const bEvent = storeState.value[b]?.value;

      return (aEvent?.startDate ?? 0) - (bEvent?.startDate ?? 0);
    });
