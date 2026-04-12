import { CashoutOfferResponse } from "@/api/bet/cashout";
import { BetItemType } from "@/shared/utils/bet";
import { signal } from "@preact/signals";

export const betHistoryState = signal<BetItemType[]>([]);
export const currentPageState = signal<number>(1);
export const totalPagesState = signal<number>(1);

export const cashOutOfferState = signal<Record<string, CashoutOfferResponse>>({});
