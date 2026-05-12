import { storeState } from "@/state/storeState";

export const isEventValidForDisplay = (event?: {
  startTime: string;
  // `tEventModel.status` is numeric in the new model — kept permissive
  // because the legacy string compares below still no-op for numbers and a
  // proper numeric mapping ("Finished" → ?, etc.) hasn't landed yet.
  status?: string | number;
}) => {
  if (
    !event ||
    event.status === "Finished" ||
    event.status === "Prefinished" ||
    event.status === "Coverage lost" ||
    event.status === "Suspended"
  )
    return false;

  if (new Date(event.startTime).getTime() < Date.now() - 1000 * 60 * 60 * 24)
    return false;

  return true;
};

export const sortEventIdsByStartDate = (ids: number[]) =>
  [...ids]
    // .filter((id) => isEventValidForDisplay(storeState.value[id]?.value))
    .sort((a, b) => {
      const aEvent = storeState.value[a]?.value;
      const bEvent = storeState.value[b]?.value;

      return (
        new Date(aEvent?.startTime ?? "").getTime() -
        new Date(bEvent?.startTime ?? "").getTime()
      );
    });
