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
  combinedOdds = 1,
): string | null {
  const { minStake, maxStake, maxPayout } = stakeLimitsForBetType(
    limits,
    betType,
  );
  const cur = currency ?? "";
  if (minStake != null && stake < minStake) {
    return `Minimum stake is ${minStake}${cur ? ` ${cur}` : ""}`;
  }
  if (maxStake != null && stake > maxStake) {
    return `Maximum stake is ${maxStake}${cur ? ` ${cur}` : ""}`;
  }
  if (maxPayout != null && stake * combinedOdds > maxPayout) {
    return `Potential payout exceeds maximum of ${maxPayout}${cur ? ` ${cur}` : ""}`;
  }
  return null;
}
