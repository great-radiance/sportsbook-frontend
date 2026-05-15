import { signal } from "@preact/signals";

/** Optional client-side logo URL cache; match UIs currently hide team badges (see Banner / Match / MiniMatch / Moneyline / TopPlayerCard). */
export const teamlogosState = signal<Record<string, Record<string, string>>>(
  {},
);

function normalizeTeamNameForLogo(team: string): string {
  if (!team) return "";
  return team
    .replace(/\s*\(?u(?:\s|-)?(?:1[0-9]|2[0-9])\)?$/i, "")
    .replace(/\s*youth$/i, "")
    .replace(/\s*\(w\)\s*$/i, "")
    .trim();
}

/** Cached logo URL when something has populated `teamlogosState` (no remote logo API). */
export function cachedTeamLogoUrl(
  sport: string | undefined,
  team: string,
): string | null {
  if (!sport || !team) return null;
  const normalizedTeam = normalizeTeamNameForLogo(team);
  const map = teamlogosState.value[sport];
  return map?.[team] ?? map?.[normalizedTeam] ?? null;
}
