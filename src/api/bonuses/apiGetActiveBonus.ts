import { hasPlayerSessionUserId, instance } from "../instance";

export type ActiveFreeBet = {
  userBonusId: string;
  freebetAmount: number;
  currency: string;
  expiresAt: string;
  applicableBetTypes: Array<"single" | "parlay">;
  minOdds: number;
  wageringTarget: number;
  wageringAchieved: number;
  progressPercent: number;
  remaining: number;
};

type ActiveBonusApiRow = {
  bonus: {
    _id?: string;
    freebetAmount: number;
    currency: string;
    expiresAt: string;
  };
  wagering?: {
    wageringTarget?: number;
    wageringAchieved?: number;
  };
  applicableBetTypes?: Array<"single" | "parlay">;
  minOdds?: number;
  progressPercent?: number;
  remaining?: number;
};

/** `GET /users/bonuses/active` — unused allocated free bet for the player. */
export async function apiGetActiveBonus(): Promise<ActiveFreeBet | null> {
  if (!hasPlayerSessionUserId()) return null;

  const { data } = await instance.get<{ data: ActiveBonusApiRow | null }>(
    "users/bonuses/active",
  );
  const row = data?.data;
  if (!row?.bonus) return null;

  const bonusId =
    typeof row.bonus._id === "string"
      ? row.bonus._id
      : row.bonus._id != null
        ? String(row.bonus._id)
        : "";

  if (!bonusId) return null;

  const wageringTarget = row.wagering?.wageringTarget ?? 0;
  const wageringAchieved = row.wagering?.wageringAchieved ?? 0;

  return {
    userBonusId: bonusId,
    freebetAmount: row.bonus.freebetAmount,
    currency: row.bonus.currency,
    expiresAt: row.bonus.expiresAt,
    applicableBetTypes: row.applicableBetTypes ?? ["single", "parlay"],
    minOdds: row.minOdds ?? 1,
    wageringTarget,
    wageringAchieved,
    progressPercent:
      row.progressPercent ??
      (wageringTarget > 0
        ? Math.min(100, Math.round((wageringAchieved / wageringTarget) * 100))
        : 0),
    remaining:
      row.remaining ?? Math.max(0, wageringTarget - wageringAchieved),
  };
}
