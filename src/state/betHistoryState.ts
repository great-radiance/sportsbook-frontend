import { BetItemType } from "@/shared/utils/bet";
import { signal } from "@preact/signals";

export const betHistoryState = signal<BetItemType[]>([]);
export const currentPageState = signal<number>(1);
export const totalPagesState = signal<number>(1);
