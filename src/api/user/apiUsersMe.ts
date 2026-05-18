import { instance } from "../instance";

export type PlayerStatus =
  | "active"
  | "suspended"
  | "blocked"
  | "self_excluded"
  | "pending_verification"
  | "limited";

export type UserMe = {
  playerId: string;
  operatorId: string;
  username: string;
  email?: string;
  status: PlayerStatus | string;
  currency: string;
  language?: string;
  lastActiveAt?: string;
};

export type BettingLimitsBlock = {
  minStake: number;
  maxStake: number;
  maxPayout: number;
  maxDailyStake: number;
  maxDailyPayout: number;
  currency: string;
  maxParlayLegs?: number;
};

export type UserLimits = {
  single: BettingLimitsBlock;
  parlay: BettingLimitsBlock;
};

export type UserExposure = {
  dailyStakeTotal: number;
  unsettledLiability: number;
  dailyPayoutLiability: number;
  periodDate: string;
  currency: string;
};

/** `GET /users/me` */
export async function apiGetUsersMe(): Promise<UserMe> {
  const { data } = await instance.get<{ data: UserMe }>("/users/me");
  return data.data;
}

/** `GET /users/me/limits` */
export async function apiGetUsersMeLimits(): Promise<UserLimits> {
  const { data } = await instance.get<{ data: UserLimits }>("/users/me/limits");
  return data.data;
}

/** `GET /users/me/exposure` */
export async function apiGetUsersMeExposure(): Promise<UserExposure> {
  const { data } = await instance.get<{ data: UserExposure }>(
    "/users/me/exposure",
  );
  return data.data;
}

export function canPlayerPlaceBets(status: string | undefined): boolean {
  return status === "active" || status === "limited";
}

/** User-facing copy per integration guide § Player status. */
export function playerStatusMessage(status: string | undefined): string | null {
  switch (status) {
    case "active":
      return null;
    case "limited":
      return "Responsible gambling limits are active on your account.";
    case "suspended":
      return "Your account is temporarily suspended.";
    case "blocked":
      return "Your account has been blocked. Please contact support.";
    case "self_excluded":
      return "You have self-excluded from betting.";
    case "pending_verification":
      return "Please verify your identity to continue betting.";
    default:
      return status ? `Account status: ${status}` : null;
  }
}
