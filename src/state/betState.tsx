import { betType, SelectedOddType } from "@/shared/utils/bet";
import { signal } from "@preact/signals";
import { BetSelection } from "@/shared/utils/EventsUtils";
import { BetItemType } from "@/shared/utils/bet";
import { isMobile } from "@/state/isMobile";
import type { UserExposure, UserLimits, UserMe } from "@/api/user/apiUsersMe";

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
/** Bet + cashout amount when opening `CashoutDialog`. */
export const selectedCashoutBet = signal<BetItemType | null>(null);
export const selectedCashoutAmount = signal<number>(0);

export const selectedBetslipTab = signal<"bet-slip" | "my-bet">("bet-slip");

export const isBonusInfoOpen = signal<boolean>(false);

export const isOpenedMyBet = signal<boolean>(isMobile.value ? false : true);

export const isBuilding = signal<boolean>(false);

/** `GET /users/me` — loaded on app start in MainLayout. */
export const playerProfile = signal<UserMe | null>(null);
export const playerLimits = signal<UserLimits | null>(null);
/** `GET /users/me/exposure` — daily stake totals for RG UI. */
export const playerExposure = signal<UserExposure | null>(null);
export const playerSessionReady = signal<boolean>(false);

/** `POST /odds88/bet-builder/price` — combined price when bet builder mode is active. */
export const betBuilderPrice = signal<number | null>(null);
export const betBuilderCombinable = signal<boolean>(false);
export const betBuilderRejectMessage = signal<string | null>(null);
export const betBuilderPriceLoading = signal<boolean>(false);

export type EventBetBuilderPriceState = {
  price: number | null;
  combinable: boolean;
  loading: boolean;
  rejectMessage: string | null;
  /** Selection set this price was fetched for — avoids duplicate API calls. */
  selectionKey?: string;
};

/** Combined BB prices keyed by eventId (multi-slip / implicit bet builders). */
export const betBuilderPricesByEvent = signal<
  Record<number, EventBetBuilderPriceState>
>({});

/** Stable idempotency key per bet attempt (integration guide § Step 4). */
export const betSlipIdempotencyKey = signal<string>(crypto.randomUUID());

export const isRepeatConfirmOpen = signal<boolean>(false);
export const selectedRepeatBet = signal<BetItemType | null>(null);

export const systemBetSpecifier = signal<Record<number, number>>({});
