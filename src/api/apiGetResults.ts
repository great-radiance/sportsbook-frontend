import { instance } from "./instance";

export const apiGetResults = async (eventId: number) => {
  const response = await instance.get(`/cybet/matches/result/${eventId}`);
  return response.data;
};