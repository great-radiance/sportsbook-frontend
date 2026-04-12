import { Live, Participant } from "@/shared/utils/types";
import { instance } from "../instance";
import { tMarket, tParticipant } from "@/types/tEvent";

export interface FeaturedMatch {
  [sport: string]: {
    [region: string]: {
      [league: string]: number[];
    };
  };
}

export const apiGetFeaturedMatches = async (): Promise<FeaturedMatch> => {
  const response = await instance.get<FeaturedMatch>(
    `/cybet/admin/ui-configuration/Featured/Matches`,
  );
  return response.data;
};
