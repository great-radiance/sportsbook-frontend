import { instance } from "../instance";

export type tSport = {
  providerId: number;
  slug: string;
  translations: Record<string, string>;
}

export const apiGetSports = async () => {
  const response = await instance.get<tSport[]>(
    `/cybet/matches/sports`
  );

  return response.data;
};
