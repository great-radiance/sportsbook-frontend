import { instance } from "../instance";
import { tPopularLeague } from "@/types/tPopularLeagues";
import { summarySports } from "@/state/summarySports";
import slugify from "slugify";

export interface FeaturedLeague {
  [sport: string]: {
    [region: string]: string[];
  };
}

export const apiGetFeaturedLeagues = async (): Promise<FeaturedLeague> => {
  const response = await instance.get<FeaturedLeague>(
    `/cybet/admin/ui-configuration/Featured/Leagues`,
  );
  return response.data;
};
