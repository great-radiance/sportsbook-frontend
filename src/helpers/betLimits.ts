import type { UserLimits } from "@/api/user/apiUsersMe";

export type StakeLimitBlock = {
  minStake?: number;
  maxStake?: number;
  maxPayout?: number;
  maxParlayLegs?: number;
};

export function stakeLimitsForBetType(
  limits: UserLimits | null,
  betType: "single" | "parlay",
): StakeLimitBlock {
  if (!limits) return {};
  const block = betType === "single" ? limits.single : limits.parlay;
  return {
    minStake: block.minStake,
    maxStake: block.maxStake,
    maxPayout: block.maxPayout,
    maxParlayLegs: block.maxParlayLegs,
  };
}

export function maxParlayLegsFromLimits(limits: UserLimits | null): number {
  return limits?.parlay?.maxParlayLegs ?? 30;
}

export function validateStakeAmount(
  stake: number,
  limits: UserLimits | null,
  betType: "single" | "parlay",
  currency?: string,
): string | null {
  const { minStake, maxStake } = stakeLimitsForBetType(limits, betType);
  const cur = currency ?? "";
  if (minStake != null && stake < minStake) {
    return `Minimum stake is ${minStake}${cur ? ` ${cur}` : ""}`;
  }
  if (maxStake != null && stake > maxStake) {
    return `Maximum stake is ${maxStake}${cur ? ` ${cur}` : ""}`;
  }
  return null;
}
