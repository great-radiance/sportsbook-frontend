import { betType, SelectedOddType } from "@/shared/utils/bet";
import { signal } from "@preact/signals";
import { BetSelection } from "@/shared/utils/EventsUtils";
import { BetItemType } from "@/shared/utils/bet";
import { CashoutOfferResponse } from "@/api/bet/cashout";
import { isMobile } from "@/state/isMobile";
import type { UserLimits, UserMe } from "@/api/user/apiUsersMe";

export const balance = signal<number>(0);
export const currency = signal<string>("USD");
export const accessToken = signal<string>("");

//open novi bet
export const selectedBets = signal<BetSelection[]>([]);

/** Current bet slip lines (integration guide: each line is a selection with odds). */
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

/** `GET /users/me` — loaded on app start in MainLayout. */
export const playerProfile = signal<UserMe | null>(null);
export const playerLimits = signal<UserLimits | null>(null);
export const playerSessionReady = signal<boolean>(false);

/** `POST /odds88/bet-builder/price` — combined price when bet builder mode is active. */
export const betBuilderPrice = signal<number | null>(null);
export const betBuilderCombinable = signal<boolean>(false);
export const betBuilderRejectMessage = signal<string | null>(null);
export const betBuilderPriceLoading = signal<boolean>(false);

export const isRepeatConfirmOpen = signal<boolean>(false);
export const selectedRepeatBet = signal<BetItemType | null>(null);

export const systemBetSpecifier = signal<Record<number, number>>({});
