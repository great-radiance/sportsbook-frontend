import { instance } from "../instance";

export type tLeague = {
  providerId: number;
  slug: string;
  translations: Record<string, string>;
};

export const apiGetLeagues = async (sport: string) => {
  const response = await instance.get<any[]>(`/cybet/matches/leagues`, {
    params: { sport: sport },
  });

  return response.data as tLeague[];
};
