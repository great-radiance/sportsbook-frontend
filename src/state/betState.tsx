import { betType, SelectedOddType } from "@/shared/utils/bet";
import { signal } from "@preact/signals";
import { BetSelection } from "@/shared/utils/EventsUtils";
import { BetItemType } from "@/shared/utils/bet";
import { CashoutOfferResponse } from "@/api/bet/cashout";
import { isMobile } from "@/state/isMobile";

export const balance = signal<number>(0);
export const currency = signal<string>("USD");
export const accessToken = signal<string>("");

//open novi bet
export const selectedBets = signal<BetSelection[]>([]);

export const selectedOdds = signal<SelectedOddType[]>([]);
export const selectedBetType = signal<betType>("single");
export const multipleBetAmount = signal<number>(0);
export const buildingBetAmount = signal<number>(0);
export const myBetsState = signal<BetItemType[]>([]);
export const selectedCashoutBetId = signal<string | null>(null);
export const selectedCashoutOffer = signal<CashoutOfferResponse | null>(null);

export const selectedBetslipTab = signal<"bet-slip" | "my-bet">("bet-slip");

export const isBonusInfoOpen = signal<boolean>(false);

export const isOpenedMyBet = signal<boolean>(isMobile.value ? false : true);

export const isBuilding = signal<boolean>(false);

export const isRepeatConfirmOpen = signal<boolean>(false);
export const selectedRepeatBet = signal<BetItemType | null>(null);

export const systemBetSpecifier = signal<Record<number, number>>({});
