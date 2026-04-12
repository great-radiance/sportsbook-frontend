import { Live, Odd } from "@/shared/utils/types";
import { tEventModel, tOddsModel } from "@/types/typesForSocket.ts/tEventModel";
import { signal, computed, batch, Signal } from "@preact/signals";

// Normalized tables as signals
// export const StoreState = signal({});
export const storeState = signal<Record<number, Signal<tEventModel>>>({});
export const willBeDeletedEventIds = signal<number>();
export const oddsStoreState = signal<
  Record<
    string,
    Signal<{
      id: string;
      eId: number;
      mId: string;
      eStatus: string;
      mStatus: string;
      status: string;
      mv: number;
      value: number;
    }>
  >
>({});
