import { BetItemType } from "@/shared/utils/bet";
import { signal } from "@preact/signals";

export const betHistoryState = signal<BetItemType[]>([]);
export const currentPageState = signal<number>(1);
export const totalPagesState = signal<number>(1);
/** Open vs settled tab in `OpenBets` (sidebar / my bets). */
export const openBetsTabState = signal<"open" | "settled">("open");
/** Bump to force `OpenBets` to refetch history (e.g. after place bet). */
export const betHistoryRefreshNonce = signal(0);

export function requestBetHistoryRefresh(): void {
  betHistoryRefreshNonce.value += 1;
}
