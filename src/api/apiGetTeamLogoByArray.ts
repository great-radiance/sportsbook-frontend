import { getAppConfig } from "@/shared/config/appConfig";
import { instance } from "./instance";
import { teamlogosState } from "@/state/teamlogosState";
import { normalizeTeamNameForLogo } from "@/helpers/getTeamlogos";

export const apiGetTeamLogoByArray = async (sport: string, teams: string[]) => {
  if (teams.length === 0) return {};
  const teamsArray =
    Array.from(
      new Set(
        teams
          .map((team) => normalizeTeamNameForLogo(team))
          .filter((team) => team && !teamlogosState.value[sport]?.[team]),
      ),
    ) ?? [];
  if (teamsArray.length === 0) return {};
  const response = await instance.post("cybet/matches/redis-logos", {
    sport: sport,
    participants: teamsArray,
  });
  return response.data;
};
