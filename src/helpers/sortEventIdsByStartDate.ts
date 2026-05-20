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

function startTimeMs(eventId: number): number | null {
  const raw = storeState.value[eventId]?.value?.startTime;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Ascending by `startTime`; events without a valid time are listed last. */
export const sortEventIdsByStartDate = (ids: number[]) =>
  [...ids].sort((a, b) => {
    const aMs = startTimeMs(a);
    const bMs = startTimeMs(b);
    if (aMs == null && bMs == null) return 0;
    if (aMs == null) return 1;
    if (bMs == null) return -1;
    return aMs - bMs;
  });
