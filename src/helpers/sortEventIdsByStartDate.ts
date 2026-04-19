import { storeState } from "@/state/storeState";

export const isEventValidForDisplay = (event?: {
  startDate?: number;
  status?: string;
}) => {
  if (!event || typeof event.startDate !== "number") return false;

  const status = event.status?.toUpperCase().trim() ?? "";
  const isLiveOrSuspended = status === "LIVE" || status === "SUSPENDED";
  const isFinished =
    status === "ENDED" ||
    status === "FINISHED" ||
    status === "CLOSED" ||
    status === "COMPLETED";

  // Hide events that are already finished or stale prematch events with a past start time.
  if (isFinished) return false;
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
