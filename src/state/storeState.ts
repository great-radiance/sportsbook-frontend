import { Live, Odd } from "@/shared/utils/types";
import { tEventModel } from "@/types/typesForSocket.ts/tEventModel";
import { signal, computed, batch, Signal } from "@preact/signals";

// Normalized tables as signals
// export const StoreState = signal({});
export const storeState = signal<Record<number, Signal<tEventModel>>>({});
export const willBeDeletedEventIds = signal<number>();

/** Composite key: `{eventId}-{marketId}-{selectionId}` */
export function selectionStoreKey(
  eventId: number,
  marketId: number,
  selectionId: number,
): string {
  return `${eventId}-${marketId}-${selectionId}`;
}

export const selectionsStoreState = signal<
  Record<
    string,
    Signal<{
      id: number;
      eId: number;
      mId: number;
      etradingStatus: number;
      mtradingStatus: number;
      status: number;
      price: number;
      mv: number;
    }>
  >
>({});
