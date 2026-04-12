import {
  Sport,
  Region,
  Competition,
  Participant,
  Live,
  Market,
} from "@/shared/utils/types";
import { instance } from "./instance";
import qs from "qs";
import { tEvent } from "@/types/tEvent";

export const apiGetTeamLogo = async (sport: string, teamName: string) => {
  const response = await instance.get(
    `/cybet/matches/redis-logo/${encodeURIComponent(sport)}/${encodeURIComponent(teamName)}`,
  );
  return response.data as string;
};
