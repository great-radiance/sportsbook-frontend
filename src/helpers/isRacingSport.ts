/** Thoroughbred, Greyhound, Harness (SportsNovi ids). */
export const RACING_SPORT_IDS = new Set([457, 458, 459]);

export function isRacingSport(
  sportId?: number | null,
  sportName?: string | null,
): boolean {
  if (sportId != null && RACING_SPORT_IDS.has(sportId)) return true;

  const sport = (sportName ?? "").toLowerCase();
  if (
    /thoroughbred|greyhound|greyhounds|harness/.test(sport) ||
    /horse\s*racing/.test(sport) ||
    /\bracing\b/.test(sport)
  ) {
    return true;
  }

  return false;
}
