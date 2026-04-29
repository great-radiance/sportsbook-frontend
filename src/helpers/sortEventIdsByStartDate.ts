import { storeState } from "@/state/storeState";

export const isEventValidForDisplay = (event?: {
  startDate: number;
  status?: string;
}) => {
  if (
    !event ||
    event.status === "Finished" ||
    event.status === "Prefinished" ||
    event.status === "Coverage lost" ||
    event.status === "Suspended"
  )
    return false;

  if (event.startDate < Date.now() - 1000 * 60 * 60 * 24) return false;

  return true;
};

export const sortEventIdsByStartDate = (ids: number[]) =>
  [...ids]
    // .filter((id) => isEventValidForDisplay(storeState.value[id]?.value))
    .sort((a, b) => {
      const aEvent = storeState.value[a]?.value;
      const bEvent = storeState.value[b]?.value;

      return (aEvent?.startDate ?? 0) - (bEvent?.startDate ?? 0);
    });
