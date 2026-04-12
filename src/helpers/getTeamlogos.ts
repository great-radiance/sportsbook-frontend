import { apiGetTeamLogoByArray } from "@/api/apiGetTeamLogoByArray";
import { teamlogosState } from "@/state/teamlogosState";

export const normalizeTeamNameForLogo = (team: string): string => {
  if (!team) return "";
  return team
    .replace(/\s*\(?u(?:\s|-)?(?:1[0-9]|2[0-9])\)?$/i, "")
    .replace(/\s*youth$/i, "")
    .replace(/\s*\(w\)\s*$/i, "")
    .trim();
};

export const getTeamlogo = (sport: string, team: string) => {
  const normalizedTeam = normalizeTeamNameForLogo(team);
  return (
    teamlogosState.value[sport]?.[team] ??
    teamlogosState.value[sport]?.[normalizedTeam] ??
    null
  );
};

/** Fetch logos only for teams not already cached for this sport; merges into teamlogosState. */
export const getTeamlogosByArray = async (
  sport: string,
  teams: string[],
): Promise<void> => {
  const teamArray = Array.from(
    new Set(
      teams
        ?.map((team) => normalizeTeamNameForLogo(team))
        .filter((team) => team && !teamlogosState.value[sport]?.[team]),
    ),
  );
  if (teamArray.length === 0) return;

  const logos = await apiGetTeamLogoByArray(sport, teamArray);
  teamlogosState.value[sport] = { ...teamlogosState.value[sport], ...logos };
  teamlogosState.value = { ...teamlogosState.value };
};
